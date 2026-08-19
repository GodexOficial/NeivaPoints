import type { PointTransaction, Student, StudentWithStats } from '../types';
import { StorageService } from './storage';
import { enrichStudentWithStats, checkLevelUp } from '../utils/levelCalculator';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

export interface PointActionResult {
  student: StudentWithStats;
  transaction: PointTransaction;
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
}

export class PointsService {
  /**
   * Generates a unique transaction ID.
   */
  private static generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get all transactions (async - loads from Supabase first).
   */
  static async getAllTransactions(): Promise<PointTransaction[]> {
    // Try Supabase first
    if (isSupabaseConfigured) {
      try {
        const supabaseTransactions = await SupabaseService.getAllTransactions();
        if (supabaseTransactions.length > 0) {
          StorageService.setTransactions(supabaseTransactions); // Cache locally
          return supabaseTransactions;
        }
      } catch (error) {
        console.warn('Supabase error loading transactions, falling back to localStorage:', error);
      }
    }

    // Fallback to localStorage
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    // Sort newest first
    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get transactions for a specific student, newest first.
   */
  static async getStudentTransactions(studentId: string): Promise<PointTransaction[]> {
    const all = await this.getAllTransactions();
    return all.filter((t) => t.studentId === studentId);
  }

  /**
   * Add points to a student (async - syncs with Supabase).
   */
  static async addPoints(params: {
    studentId: string;
    amount: number;
    reason?: string;
  }): Promise<PointActionResult> {
    const amount = Math.floor(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive number.');
    }

    const students = StorageService.getStudents<Student[]>([]);
    const studentIndex = students.findIndex((s) => s.id === params.studentId);
    if (studentIndex === -1) {
      throw new Error('Student not found.');
    }

    const student = students[studentIndex];
    const previousPoints = Math.max(0, Math.floor(student.points || 0));
    const newPoints = previousPoints + amount;
    const now = new Date().toISOString();

    // Update student
    const updatedStudent: Student = {
      ...student,
      points: newPoints,
      updatedAt: now,
    };
    students[studentIndex] = updatedStudent;
    StorageService.setStudents(students);

    // Create transaction
    const transaction: PointTransaction = {
      id: this.generateTransactionId(),
      studentId: params.studentId,
      amount,
      type: 'add',
      reason: params.reason?.trim() || undefined,
      previousPoints,
      newPoints,
      createdAt: now,
    };

    // Save transaction to localStorage
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    transactions.unshift(transaction);
    StorageService.setTransactions(transactions);

    // Sync to Supabase
    if (isSupabaseConfigured) {
      try {
        await SupabaseService.updateStudent(params.studentId, { points: newPoints });
        await SupabaseService.createTransaction(transaction);
      } catch (error) {
        console.error('Error saving transaction to Supabase:', error);
      }
    }

    const levelCheck = checkLevelUp(previousPoints, newPoints);

    return {
      student: enrichStudentWithStats(updatedStudent),
      transaction,
      leveledUp: levelCheck.leveledUp,
      oldLevel: levelCheck.oldLevel,
      newLevel: levelCheck.newLevel,
    };
  }

  /**
   * Remove points from a student (async - syncs with Supabase).
   * Rejects if amount > previousPoints or invalid amount.
   */
  static async removePoints(params: {
    studentId: string;
    amount: number;
    reason?: string;
  }): Promise<PointActionResult> {
    const amount = Math.floor(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Please enter a valid positive number.');
    }

    const students = StorageService.getStudents<Student[]>([]);
    const studentIndex = students.findIndex((s) => s.id === params.studentId);
    if (studentIndex === -1) {
      throw new Error('Student not found.');
    }

    const student = students[studentIndex];
    const previousPoints = Math.max(0, Math.floor(student.points || 0));

    if (amount > previousPoints) {
      throw new Error('The student does not have enough points.');
    }

    const newPoints = previousPoints - amount;
    const now = new Date().toISOString();

    // Update student
    const updatedStudent: Student = {
      ...student,
      points: newPoints,
      updatedAt: now,
    };
    students[studentIndex] = updatedStudent;
    StorageService.setStudents(students);

    // Create transaction
    const transaction: PointTransaction = {
      id: this.generateTransactionId(),
      studentId: params.studentId,
      amount,
      type: 'remove',
      reason: params.reason?.trim() || undefined,
      previousPoints,
      newPoints,
      createdAt: now,
    };

    // Save transaction to localStorage
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    transactions.unshift(transaction);
    StorageService.setTransactions(transactions);

    // Sync to Supabase
    if (isSupabaseConfigured) {
      try {
        await SupabaseService.updateStudent(params.studentId, { points: newPoints });
        await SupabaseService.createTransaction(transaction);
      } catch (error) {
        console.error('Error saving transaction to Supabase:', error);
      }
    }

    const levelCheck = checkLevelUp(previousPoints, newPoints);

    return {
      student: enrichStudentWithStats(updatedStudent),
      transaction,
      leveledUp: false,
      oldLevel: levelCheck.oldLevel,
      newLevel: levelCheck.newLevel,
    };
  }

  /**
   * Delete all transactions for a student.
   */
  static async deleteStudentTransactions(studentId: string): Promise<void> {
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    const filtered = transactions.filter((t) => t.studentId !== studentId);
    StorageService.setTransactions(filtered);
  }
}
