import type { PointTransaction, Student, StudentWithStats } from '../types';
import { StorageService } from './storage';
import { enrichStudentWithStats, checkLevelUp } from '../utils/levelCalculator';

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
   * Get all transactions.
   */
  static getAllTransactions(): PointTransaction[] {
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    // Sort newest first
    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get transactions for a specific student, newest first.
   */
  static getStudentTransactions(studentId: string): PointTransaction[] {
    const all = this.getAllTransactions();
    return all.filter((t) => t.studentId === studentId);
  }

  /**
   * Add points to a student.
   */
  static addPoints(params: {
    studentId: string;
    amount: number;
    reason?: string;
  }): PointActionResult {
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

    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    transactions.unshift(transaction);
    StorageService.setTransactions(transactions);

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
   * Remove points from a student.
   * Rejects if amount > previousPoints or invalid amount.
   */
  static removePoints(params: {
    studentId: string;
    amount: number;
    reason?: string;
  }): PointActionResult {
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

    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    transactions.unshift(transaction);
    StorageService.setTransactions(transactions);

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
  static deleteStudentTransactions(studentId: string): void {
    const transactions = StorageService.getTransactions<PointTransaction[]>([]);
    const filtered = transactions.filter((t) => t.studentId !== studentId);
    StorageService.setTransactions(filtered);
  }
}
