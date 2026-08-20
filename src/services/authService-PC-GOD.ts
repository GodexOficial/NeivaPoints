import { StorageService } from "./storage";
import { StudentService } from "./studentService";
import { SupabaseService } from "./supabaseService";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { AuthUser, ClassId, Student } from "../types";

export interface TeacherAccount {
  id: string;
  name: string;
  emailOrUsername: string;
  password: string;
  createdAt: string;
}

const TEACHERS_KEY = "sistema_pontos_teachers_v1";
const AUTH_SESSION_KEY = "sistema_pontos_auth_session_v1";

const DEFAULT_SECURITY_CODE = "PROF2025";
const DEFAULT_STUDENT_SECURITY_CODE = "ALUNO2026";

// ✅ No default teacher account - all teachers must register with PROF2025


export class AuthService {
  private static teacherSecurityKey = DEFAULT_SECURITY_CODE;
  private static studentSecurityKey = DEFAULT_STUDENT_SECURITY_CODE;

  /** Load shared registration keys from Supabase into memory. */
  static async loadSecurityKeys(): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["teacher_security_key", "student_security_key"]);

    if (error) throw error;

    for (const setting of data || []) {
      if (setting.key === "teacher_security_key" && setting.value) {
        this.teacherSecurityKey = setting.value;
      }
      if (setting.key === "student_security_key" && setting.value) {
        this.studentSecurityKey = setting.value;
      }
    }
  }

  private static async saveSecurityKey(
    key: "teacher_security_key" | "student_security_key",
    value: string,
  ): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error("Supabase is not configured.");
    }

    const { error } = await supabase.from("app_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) throw error;
  }

  /**
   * Get all registered teacher accounts (async - loads from Supabase first).
   */
  static async getTeachers(): Promise<TeacherAccount[]> {
    if (isSupabaseConfigured) {
      try {
        const supabaseTeachers = await SupabaseService.getAllTeachers();
        if (supabaseTeachers.length > 0) {
          StorageService.setItem(TEACHERS_KEY, supabaseTeachers);
          return supabaseTeachers;
        }
      } catch (error) {
        console.warn('Supabase error loading teachers, falling back to localStorage:', error);
      }
    }

    const teachers = StorageService.getItem<TeacherAccount[]>(TEACHERS_KEY, []);
    if (!teachers || teachers.length === 0) {
      StorageService.setItem(TEACHERS_KEY, []);
      return [];
    }
    return teachers;
  }

  /**
   * Save teachers list.
   */
  static saveTeachers(teachers: TeacherAccount[]): void {
    StorageService.setItem(TEACHERS_KEY, teachers);
  }

  /**
   * Get the Teacher Security Access Key.
   */
  static getTeacherSecurityKey(): string {
    return this.teacherSecurityKey;
  }

  /**
   * Update the Teacher Security Access Key.
   */
  static async setTeacherSecurityKey(newKey: string): Promise<void> {
    const trimmed = newKey.trim();
    if (!trimmed) {
      throw new Error("Security key cannot be empty.");
    }
    await this.saveSecurityKey("teacher_security_key", trimmed);
    this.teacherSecurityKey = trimmed;
  }

  /** Get the key required to create a student account. */
  static getStudentSecurityKey(): string {
    return this.studentSecurityKey;
  }

  /** Update the key required to create a student account. */
  static async setStudentSecurityKey(newKey: string): Promise<void> {
    const trimmed = newKey.trim();
    if (!trimmed) {
      throw new Error("Security key cannot be empty.");
    }
    await this.saveSecurityKey("student_security_key", trimmed);
    this.studentSecurityKey = trimmed;
  }

  /**
   * Register a new Teacher account. Requires the teacher security code.
   */
  static async registerTeacher(params: {
    name: string;
    emailOrUsername: string;
    password: string;
    securityKey: string;
  }): Promise<{ success: boolean; teacher?: TeacherAccount; error?: string }> {
    const trimmedName = params.name.trim();
    const trimmedUser = params.emailOrUsername.trim().toLowerCase();
    const trimmedPass = params.password.trim();
    const trimmedKey = params.securityKey.trim();

    if (!trimmedName) {
      return { success: false, error: "Please enter your full name." };
    }
    if (!trimmedUser) {
      return { success: false, error: "Please enter a username or email." };
    }
    if (!trimmedPass || trimmedPass.length < 4) {
      return {
        success: false,
        error: "Password must be at least 4 characters.",
      };
    }

    await this.loadSecurityKeys();
    const currentKey = this.getTeacherSecurityKey();
    if (trimmedKey !== currentKey) {
      return {
        success: false,
        error:
          "Invalid Teacher Security Key. Students cannot create teacher accounts.",
      };
    }

    const teachers = await this.getTeachers();
    const existing = teachers.find(
      (t) => t.emailOrUsername.toLowerCase() === trimmedUser,
    );
    if (existing) {
      return {
        success: false,
        error: "A teacher with this username/email is already registered.",
      };
    }

    const newTeacherId = `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let createdTeacher: TeacherAccount = {
      id: newTeacherId,
      name: trimmedName,
      emailOrUsername: trimmedUser,
      password: trimmedPass,
      createdAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        createdTeacher = await SupabaseService.createTeacher({
          id: newTeacherId,
          name: trimmedName,
          emailOrUsername: trimmedUser,
          password: trimmedPass,
        });
      } catch (error) {
        console.error('Error saving teacher to Supabase:', error);
        return {
          success: false,
          error: "Não foi possível salvar o professor no Supabase. Verifique as políticas RLS da tabela teachers.",
        };
      }
    }

    teachers.push(createdTeacher);
    this.saveTeachers(teachers);

    return { success: true, teacher: createdTeacher };
  }

  /**
   * Authenticate a teacher with username/email and password.
   */
  static async loginTeacher(
    emailOrUsername: string,
    password: string,
  ): Promise<{ success: boolean; teacher?: TeacherAccount; error?: string }> {
    const cleanUser = emailOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: "Please enter your username and password.",
      };
    }

    const teachers = await this.getTeachers();
    const found = teachers.find(
      (t) =>
        (t.emailOrUsername.toLowerCase() === cleanUser ||
          t.name.toLowerCase() === cleanUser) &&
        t.password === cleanPass,
    );

    if (!found) {
      return {
        success: false,
        error:
          "Invalid teacher credentials. Please verify username and password.",
      };
    }

    return { success: true, teacher: found };
  }

  /**
   * Register a new student (simple registration with name, class, username, password).
   */
  static async registerStudent(params: {
    name: string;
    classId: ClassId;
    username?: string;
    password?: string;
    securityKey: string;
  }): Promise<{ success: boolean; student?: Student; error?: string }> {
    try {
      const trimmedName = params.name.trim();
      if (!trimmedName) {
        return { success: false, error: "Please enter your full name." };
      }
      if (!params.classId) {
        return { success: false, error: "Please select your class." };
      }
      await this.loadSecurityKeys();
      if (params.securityKey.trim() !== this.getStudentSecurityKey()) {
        return {
          success: false,
          error: "Invalid Student Security Key. Ask your teacher for the registration key.",
        };
      }

      const cleanUsername = params.username?.trim()
        ? params.username.trim().toLowerCase()
        : StudentService.generateUsername(trimmedName);

      const cleanPassword = params.password?.trim() || "123456";

      // Check if username is already taken
      const students = await StudentService.getAllStudents();
      const existing = students.find(
        (s) => s.username?.toLowerCase() === cleanUsername,
      );
      if (existing) {
        return {
          success: false,
          error: "This username is already in use. Please choose another one.",
        };
      }

      const student = await StudentService.createStudent({
        name: trimmedName,
        classId: params.classId,
        username: cleanUsername,
        password: cleanPassword,
      });

      return { success: true, student };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to register student.";
      return { success: false, error: msg };
    }
  }

  /**
   * Authenticate student with username and password.
   */
  static async loginStudent(
    username: string,
    password: string,
  ): Promise<{ success: boolean; student?: Student; error?: string }> {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: "Please enter your username and password.",
      };
    }

    const student = await StudentService.authenticate(cleanUser, cleanPass);
    if (!student) {
      return {
        success: false,
        error: "Invalid student username or password.",
      };
    }

    return { success: true, student };
  }

  /**
   * Get active auth session from localStorage.
   */
  static getSession(): AuthUser | null {
    return StorageService.getItem<AuthUser | null>(AUTH_SESSION_KEY, null);
  }

  /**
   * Save active auth session to localStorage.
   */
  static setSession(user: AuthUser | null): void {
    if (user) {
      StorageService.setItem(AUTH_SESSION_KEY, user);
    } else {
      StorageService.removeItem(AUTH_SESSION_KEY);
    }
  }

  /**
   * Clear active auth session.
   */
  static clearSession(): void {
    StorageService.removeItem(AUTH_SESSION_KEY);
  }
}
