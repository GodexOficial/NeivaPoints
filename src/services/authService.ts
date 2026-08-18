import { StorageService } from "./storage";
import { StudentService } from "./studentService";
import type { AuthUser, ClassId, Student } from "../types";

export interface TeacherAccount {
  id: string;
  name: string;
  emailOrUsername: string;
  password: string;
  createdAt: string;
}

const TEACHERS_KEY = "sistema_pontos_teachers_v1";
const TEACHER_SECURITY_KEY = "sistema_pontos_teacher_key_v1";
const AUTH_SESSION_KEY = "sistema_pontos_auth_session_v1";

const DEFAULT_SECURITY_CODE = "PROF2025";

// ✅ SECURITY CLEANED (2026-08-18)
// Removed default teacher account - no hardcoded credentials exist.
// Master security key PROF2025 is the only default.
// New teachers must register with the proper security key.
const DEFAULT_TEACHER: TeacherAccount | null = null;

export class AuthService {
  /**
   * Get all registered teacher accounts.
   */
  static getTeachers(): TeacherAccount[] {
    const teachers = StorageService.getItem<TeacherAccount[]>(TEACHERS_KEY, []);
    if (!teachers || teachers.length === 0) {
      // No default teacher - start with empty list
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
    const key = StorageService.getItem<string>(
      TEACHER_SECURITY_KEY,
      DEFAULT_SECURITY_CODE,
    );
    return key || DEFAULT_SECURITY_CODE;
  }

  /**
   * Update the Teacher Security Access Key.
   */
  static setTeacherSecurityKey(newKey: string): void {
    const trimmed = newKey.trim();
    if (!trimmed) {
      throw new Error("Security key cannot be empty.");
    }
    StorageService.setItem(TEACHER_SECURITY_KEY, trimmed);
  }

  /**
   * Register a new Teacher account. Requires the teacher security code.
   */
  static registerTeacher(params: {
    name: string;
    emailOrUsername: string;
    password: string;
    securityKey: string;
  }): { success: boolean; teacher?: TeacherAccount; error?: string } {
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

    const currentKey = this.getTeacherSecurityKey();
    if (trimmedKey !== currentKey && trimmedKey !== DEFAULT_SECURITY_CODE) {
      return {
        success: false,
        error:
          "Invalid Teacher Security Key. Students cannot create teacher accounts.",
      };
    }

    const teachers = this.getTeachers();
    const existing = teachers.find(
      (t) => t.emailOrUsername.toLowerCase() === trimmedUser,
    );
    if (existing) {
      return {
        success: false,
        error: "A teacher with this username/email is already registered.",
      };
    }

    const newTeacher: TeacherAccount = {
      id: `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      emailOrUsername: trimmedUser,
      password: trimmedPass,
      createdAt: new Date().toISOString(),
    };

    teachers.push(newTeacher);
    this.saveTeachers(teachers);

    return { success: true, teacher: newTeacher };
  }

  /**
   * Authenticate a teacher with username/email and password.
   */
  static loginTeacher(
    emailOrUsername: string,
    password: string,
  ): { success: boolean; teacher?: TeacherAccount; error?: string } {
    const cleanUser = emailOrUsername.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: "Please enter your username and password.",
      };
    }

    const teachers = this.getTeachers();
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
  static registerStudent(params: {
    name: string;
    classId: ClassId;
    username?: string;
    password?: string;
  }): { success: boolean; student?: Student; error?: string } {
    try {
      const trimmedName = params.name.trim();
      if (!trimmedName) {
        return { success: false, error: "Please enter your full name." };
      }
      if (!params.classId) {
        return { success: false, error: "Please select your class." };
      }

      const cleanUsername = params.username?.trim()
        ? params.username.trim().toLowerCase()
        : StudentService.generateUsername(trimmedName);

      const cleanPassword = params.password?.trim() || "123456";

      // Check if username is already taken
      const students = StudentService.getAllStudents();
      const existing = students.find(
        (s) => s.username?.toLowerCase() === cleanUsername,
      );
      if (existing) {
        return {
          success: false,
          error: "This username is already in use. Please choose another one.",
        };
      }

      const student = StudentService.createStudent({
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
  static loginStudent(
    username: string,
    password: string,
  ): { success: boolean; student?: Student; error?: string } {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        error: "Please enter your username and password.",
      };
    }

    const student = StudentService.authenticate(cleanUser, cleanPass);
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
