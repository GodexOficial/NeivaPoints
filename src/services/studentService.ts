import type { Student, ClassId, StudentWithStats } from '../types';
import { StorageService } from './storage';
import { enrichStudentWithStats } from '../utils/levelCalculator';
import { SupabaseService } from './supabaseService';

export class StudentService {
  /**
   * Generates a clean, normalized username from a student's full name.
   */
  static generateUsername(name: string, fallbackId?: string): string {
    const normalized = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, ".")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");

    if (!normalized) {
      return `student.${fallbackId ? fallbackId.substring(4, 8) : Math.random().toString(36).substring(2, 6)}`;
    }
    return normalized;
  }

  /**
   * Generates a unique student ID.
   */
  static generateId(): string {
    return `std_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get all registered students (async - loads from Supabase first).
   */
  static async getAllStudents(): Promise<Student[]> {
    // Try Supabase first
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        const supabaseStudents = await SupabaseService.getAllStudents();
        if (supabaseStudents.length > 0) {
          StorageService.setStudents(supabaseStudents); // Cache locally
          return supabaseStudents;
        }
      } catch (error) {
        console.warn('Supabase error loading students, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const rawStudents = StorageService.getStudents<Student[]>([]);
    let hasUpdates = false;

    const students = rawStudents.map((s) => {
      let updated = false;
      const studentCopy = { ...s };

      if (!studentCopy.username) {
        studentCopy.username = this.generateUsername(studentCopy.name, studentCopy.id);
        updated = true;
      }
      if (!studentCopy.password) {
        studentCopy.password = "123456";
        updated = true;
      }

      if (updated) hasUpdates = true;
      return studentCopy;
    });

    if (hasUpdates) {
      StorageService.setStudents(students);
    }

    return students;
  }

  /**
   * Authenticate student by username or name and password.
   */
  static async authenticate(
    identifier: string,
    password: string
  ): Promise<Student | undefined> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) return undefined;

    const students = await this.getAllStudents();
    return students.find((s) => {
      const usernameMatch = s.username?.toLowerCase() === cleanId;
      const nameMatch = s.name.toLowerCase() === cleanId;
      const idMatch = s.id.toLowerCase() === cleanId;
      const passMatch = (s.password || "123456") === cleanPass;
      return (usernameMatch || nameMatch || idMatch) && passMatch;
    });
  }

  /**
   * Get all registered students enriched with calculated level and progress stats.
   */
  static async getAllStudentsWithStats(): Promise<StudentWithStats[]> {
    const students = await this.getAllStudents();
    return students.map(enrichStudentWithStats);
  }

  /**
   * Get a student by ID (async).
   */
  static async getStudentById(id: string): Promise<Student | undefined> {
    const students = await this.getAllStudents();
    return students.find((s) => s.id === id);
  }

  /**
   * Get a student by ID with calculated stats.
   */
  static async getStudentWithStatsById(id: string): Promise<StudentWithStats | undefined> {
    const student = await this.getStudentById(id);
    if (!student) return undefined;
    return enrichStudentWithStats(student);
  }

  /**
   * Get students belonging to a specific class.
   */
  static async getStudentsByClass(classId: ClassId): Promise<StudentWithStats[]> {
    const students = await this.getAllStudentsWithStats();
    return students.filter((s) => s.classId === classId);
  }

  /**
   * Register a new student (syncs with Supabase).
   */
  static async createStudent(params: {
    name: string;
    classId: ClassId;
    username?: string;
    password?: string;
    isSample?: boolean;
    initialPoints?: number;
  }): Promise<Student> {
    const trimmedName = params.name.trim();
    if (!trimmedName) {
      throw new Error("Please enter the student's name.");
    }
    if (!params.classId) {
      throw new Error("Please select a class.");
    }

    const now = new Date().toISOString();
    const tempId = this.generateId();
    const username = params.username?.trim()
      ? params.username.trim().toLowerCase()
      : this.generateUsername(trimmedName, tempId);
    const password = params.password?.trim() || "123456";

    const newStudent: Student = {
      id: tempId,
      name: trimmedName,
      username,
      password,
      classId: params.classId,
      points: Math.max(0, Math.floor(params.initialPoints || 0)),
      createdAt: now,
      updatedAt: now,
      isSample: params.isSample ?? false,
    };

    // Save to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.createStudent({
          name: trimmedName,
          classId: params.classId,
          username,
          password,
        });
      } catch (error) {
        console.error('Error saving student to Supabase:', error);
      }
    }

    // Save to localStorage as backup
    const students = await this.getAllStudents();
    const updated = [newStudent, ...students];
    StorageService.setStudents(updated);

    return newStudent;
  }

  /**
   * Update student details (syncs with Supabase).
   */
  static async updateStudent(
    id: string,
    updates: Partial<Pick<Student, "name" | "classId" | "username" | "password">>
  ): Promise<Student> {
    const students = await this.getAllStudents();
    const index = students.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error("Student not found.");
    }

    const student = students[index];
    const updatedStudent: Student = {
      ...student,
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.classId ? { classId: updates.classId } : {}),
      ...(updates.username ? { username: updates.username.trim().toLowerCase() } : {}),
      ...(updates.password ? { password: updates.password.trim() } : {}),
      updatedAt: new Date().toISOString(),
    };

    students[index] = updatedStudent;
    StorageService.setStudents(students);

    // Sync to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.updateStudent(id, updates);
      } catch (error) {
        console.error('Error updating student in Supabase:', error);
      }
    }

    return updatedStudent;
  }

  /**
   * Delete a student by ID (syncs with Supabase).
   */
  static async deleteStudent(id: string): Promise<boolean> {
    const students = await this.getAllStudents();
    const filtered = students.filter((s) => s.id !== id);
    if (filtered.length === students.length) {
      return false;
    }
    StorageService.setStudents(filtered);

    // Sync to Supabase
    if (import.meta.env.VITE_SUPABASE_URL) {
      try {
        await SupabaseService.deleteStudent(id);
      } catch (error) {
        console.error('Error deleting student from Supabase:', error);
      }
    }

    return true;
  }
}
