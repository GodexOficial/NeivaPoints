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

const SAMPLE_STUDENTS_DEF: RawSampleStudent[] = [
  // 6th Grade
  {
    id: 'sample_std_01',
    name: 'Sample Student 01',
    username: 'sample01',
    password: '123',
    classId: '6th-grade',
    points: 45,
    transactions: [
      { amount: 20, type: 'add', reason: 'Class Participation', daysAgo: 5 },
      { amount: 25, type: 'add', reason: 'Activity', daysAgo: 2 },
    ],
  },
  {
    id: 'sample_std_02',
    name: 'Sample Student 02',
    username: 'sample02',
    password: '123',
    classId: '6th-grade',
    points: 99,
    transactions: [
      { amount: 50, type: 'add', reason: 'Assignment', daysAgo: 6 },
      { amount: 30, type: 'add', reason: 'Computer Activity', daysAgo: 3 },
      { amount: 19, type: 'add', reason: 'Challenge', daysAgo: 1 },
    ],
  },
  {
    id: 'sample_std_03',
    name: 'Sample Student 03',
    username: 'sample03',
    password: '123',
    classId: '6th-grade',
    points: 150,
    transactions: [
      { amount: 50, type: 'add', reason: 'Teamwork', daysAgo: 7 },
      { amount: 50, type: 'add', reason: 'Assignment', daysAgo: 4 },
      { amount: 50, type: 'add', reason: 'Computer Activity', daysAgo: 1 },
    ],
  },

  // 7th Grade
  {
    id: 'sample_std_04',
    name: 'Sample Student 04',
    username: 'sample04',
    password: '123',
    classId: '7th-grade',
    points: 350,
    transactions: [
      { amount: 100, type: 'add', reason: 'Major Project', daysAgo: 10 },
      { amount: 150, type: 'add', reason: 'Science Fair Challenge', daysAgo: 6 },
      { amount: 100, type: 'add', reason: 'Teamwork', daysAgo: 2 },
    ],
  },
  {
    id: 'sample_std_05',
    name: 'Sample Student 05',
    username: 'sample05',
    password: '123',
    classId: '7th-grade',
    points: 272,
    transactions: [
      { amount: 100, type: 'add', reason: 'Computer Activity', daysAgo: 8 },
      { amount: 150, type: 'add', reason: 'Assignment', daysAgo: 4 },
      { amount: 22, type: 'add', reason: 'Class Participation', daysAgo: 1 },
    ],
  },
  {
    id: 'sample_std_06',
    name: 'Sample Student 06',
    username: 'sample06',
    password: '123',
    classId: '7th-grade',
    points: 100,
    transactions: [
      { amount: 50, type: 'add', reason: 'Participation', daysAgo: 5 },
      { amount: 50, type: 'add', reason: 'Activity', daysAgo: 2 },
    ],
  },

  // 8th Grade
  {
    id: 'sample_std_07',
    name: 'Sample Student 07',
    username: 'sample07',
    password: '123',
    classId: '8th-grade',
    points: 0,
    transactions: [],
  },
  {
    id: 'sample_std_08',
    name: 'Sample Student 08',
    username: 'sample08',
    password: '123',
    classId: '8th-grade',
    points: 290,
    transactions: [
      { amount: 100, type: 'add', reason: 'Robotics Challenge', daysAgo: 9 },
      { amount: 100, type: 'add', reason: 'Assignment', daysAgo: 5 },
      { amount: 90, type: 'add', reason: 'Computer Activity', daysAgo: 1 },
    ],
  },
  {
    id: 'sample_std_09',
    name: 'Sample Student 09',
    username: 'sample09',
    password: '123',
    classId: '8th-grade',
    points: 420,
    transactions: [
      { amount: 200, type: 'add', reason: 'Math Olympiad', daysAgo: 12 },
      { amount: 120, type: 'add', reason: 'Teamwork', daysAgo: 6 },
      { amount: 100, type: 'add', reason: 'Activity', daysAgo: 2 },
    ],
  },

  // 9th Grade
  {
    id: 'sample_std_10',
    name: 'Sample Student 10',
    username: 'sample10',
    password: '123',
    classId: '9th-grade',
    points: 75,
    transactions: [
      { amount: 50, type: 'add', reason: 'Class Participation', daysAgo: 6 },
      { amount: 25, type: 'add', reason: 'Activity', daysAgo: 3 },
    ],
  },
  {
    id: 'sample_std_11',
    name: 'Sample Student 11',
    username: 'sample11',
    password: '123',
    classId: '9th-grade',
    points: 199,
    transactions: [
      { amount: 100, type: 'add', reason: 'Assignment', daysAgo: 7 },
      { amount: 50, type: 'add', reason: 'Computer Activity', daysAgo: 4 },
      { amount: 49, type: 'add', reason: 'Challenge', daysAgo: 1 },
    ],
  },
  {
    id: 'sample_std_12',
    name: 'Sample Student 12',
    username: 'sample12',
    password: '123',
    classId: '9th-grade',
    points: 560,
    transactions: [
      { amount: 250, type: 'add', reason: 'Graduation Prep Project', daysAgo: 14 },
      { amount: 200, type: 'add', reason: 'Leadership Challenge', daysAgo: 7 },
      { amount: 110, type: 'add', reason: 'Computer Activity', daysAgo: 2 },
    ],
  },
];

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
    const now = Date.now();

    SAMPLE_STUDENTS_DEF.forEach((def) => {
      const createdAt = new Date(now - 14 * 86400000).toISOString();
      const student: Student = {
        id: def.id,
        name: def.name,
        username: def.username,
        password: def.password || '123',
        classId: def.classId,
        points: def.points,
        createdAt,
        updatedAt: new Date(now - 86400000).toISOString(),
        isSample: true,
      };
      newSampleStudents.push(student);

      let runningPoints = 0;
      def.transactions.forEach((tx, idx) => {
        const txCreatedAt = new Date(now - tx.daysAgo * 86400000).toISOString();
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
