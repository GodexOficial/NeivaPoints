import type { Student, PointTransaction } from '../types';
import { StorageService } from './storage';
import { ClassService } from './classService';

interface RawSampleStudent {
  id: string;
  name: string;
  username: string;
  password?: string;
  classId: '6th-grade' | '7th-grade' | '8th-grade' | '9th-grade';
  points: number;
  transactions: {
    amount: number;
    type: 'add' | 'remove';
    reason: string;
    daysAgo: number;
  }[];
}

// ✅ SECURITY CLEANED (2026-08-18)
// All sample students with default/test credentials have been removed.
// No hardcoded test accounts exist. Users must be authenticated to access.
// NOTE: Previously this array contained 12 sample students (sample01-sample12) with password '123'
const SAMPLE_STUDENTS_DEF: RawSampleStudent[] = [];

export class SampleDataService {
  static loadSampleData(): void {
    // Ensure default classes are loaded
    ClassService.getAllClasses();

    const existingStudents = StorageService.getStudents<Student[]>([]);
    const existingTransactions = StorageService.getTransactions<PointTransaction[]>([]);

    // Filter out existing sample students first to avoid duplicates
    const nonSampleStudents = existingStudents.filter((s) => !s.isSample);
    const nonSampleStudentIds = new Set(nonSampleStudents.map((s) => s.id));
    const nonSampleTransactions = existingTransactions.filter((t) => nonSampleStudentIds.has(t.studentId));

    const newSampleStudents: Student[] = [];
    const newSampleTransactions: PointTransaction[] = [];

    // SAMPLE_STUDENTS_DEF is now empty - no demo data is loaded
    SAMPLE_STUDENTS_DEF.forEach((def) => {
      const createdAt = new Date().toISOString();
      const student: Student = {
        id: def.id,
        name: def.name,
        username: def.username,
        password: def.password || 'changeme',
        classId: def.classId,
        points: def.points,
        createdAt,
        updatedAt: new Date().toISOString(),
        isSample: true,
      };
      newSampleStudents.push(student);

      let runningPoints = 0;
      def.transactions.forEach((tx, idx) => {
        const txCreatedAt = new Date().toISOString();
        const prev = runningPoints;
        runningPoints += tx.amount;
        newSampleTransactions.push({
          id: `tx_${def.id}_${idx + 1}`,
          studentId: def.id,
          amount: tx.amount,
          type: tx.type,
          reason: tx.reason,
          previousPoints: prev,
          newPoints: runningPoints,
          createdAt: txCreatedAt,
        });
      });
    });

    StorageService.setStudents([...nonSampleStudents, ...newSampleStudents]);
    StorageService.setTransactions([...nonSampleTransactions, ...newSampleTransactions]);
  }

  static clearSampleData(): void {
    const existingStudents = StorageService.getStudents<Student[]>([]);
    const existingTransactions = StorageService.getTransactions<PointTransaction[]>([]);

    const nonSampleStudents = existingStudents.filter((s) => !s.isSample);
    const nonSampleStudentIds = new Set(nonSampleStudents.map((s) => s.id));
    const nonSampleTransactions = existingTransactions.filter((t) => nonSampleStudentIds.has(t.studentId));

    StorageService.setStudents(nonSampleStudents);
    StorageService.setTransactions(nonSampleTransactions);
  }

  static hasSampleData(): boolean {
    const existingStudents = StorageService.getStudents<Student[]>([]);
    return existingStudents.some((s) => s.isSample);
  }

  static clearAllData(): void {
    StorageService.clearAll();
  }
}
