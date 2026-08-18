import type { Student, ClassId, StudentWithStats } from '../types';
import { StorageService } from './storage';
import { enrichStudentWithStats } from '../utils/levelCalculator';

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
   * Get all registered students with fallback username/password migration.
   */
  static getAllStudents(): Student[] {
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
  static authenticate(
    identifier: string,
    password: string
  ): Student | undefined {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) return undefined;

    const students = this.getAllStudents();
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
  static getAllStudentsWithStats(): StudentWithStats[] {
    const students = this.getAllStudents();
    return students.map(enrichStudentWithStats);
  }

  /**
   * Get a student by ID.
   */
  static getStudentById(id: string): Student | undefined {
    const students = this.getAllStudents();
    return students.find((s) => s.id === id);
  }

  /**
   * Get a student by ID with calculated stats.
   */
  static getStudentWithStatsById(id: string): StudentWithStats | undefined {
    const student = this.getStudentById(id);
    if (!student) return undefined;
    return enrichStudentWithStats(student);
  }

  /**
   * Get students belonging to a specific class.
   */
  static getStudentsByClass(classId: ClassId): StudentWithStats[] {
    const students = this.getAllStudentsWithStats();
    return students.filter((s) => s.classId === classId);
  }

  /**
   * Register a new student.
   */
  static createStudent(params: {
    name: string;
    classId: ClassId;
    username?: string;
    password?: string;
    isSample?: boolean;
    initialPoints?: number;
  }): Student {
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

    const students = this.getAllStudents();
    const updated = [newStudent, ...students];
    StorageService.setStudents(updated);

    return newStudent;
  }

  /**
   * Update student details (e.g., name, class, username, password).
   */
  static updateStudent(
    id: string,
    updates: Partial<Pick<Student, "name" | "classId" | "username" | "password">>
  ): Student {
    const students = this.getAllStudents();
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
    return updatedStudent;
  }

  /**
   * Delete a student by ID.
   */
  static deleteStudent(id: string): boolean {
    const students = this.getAllStudents();
    const filtered = students.filter((s) => s.id !== id);
    if (filtered.length === students.length) {
      return false;
    }
    StorageService.setStudents(filtered);
    return true;
  }
}
