export type ClassId = string;

export interface ClassInfo {
  id: ClassId;
  name: string;
  gradeNumber?: number;
  shortName?: string;
  color?: string;
  description?: string;
  createdAt?: string;
}

export const DEFAULT_CLASSES: ClassInfo[] = [
  { id: "6th-grade", name: "6th Grade", gradeNumber: 6, shortName: "6th", color: "blue", description: "6th Grade Academic Class" },
  { id: "7th-grade", name: "7th Grade", gradeNumber: 7, shortName: "7th", color: "indigo", description: "7th Grade Academic Class" },
  { id: "8th-grade", name: "8th Grade", gradeNumber: 8, shortName: "8th", color: "purple", description: "8th Grade Academic Class" },
  { id: "9th-grade", name: "9th Grade", gradeNumber: 9, shortName: "9th", color: "violet", description: "9th Grade Academic Class" },
];

export const CLASSES: ClassInfo[] = DEFAULT_CLASSES;

export const CLASS_MAP: Record<string, ClassInfo> = DEFAULT_CLASSES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<string, ClassInfo>,
);

export interface Student {
  id: string;
  name: string;
  username?: string;
  password?: string;
  classId: ClassId;
  points: number;
  createdAt: string;
  updatedAt: string;
  isSample?: boolean;
}

export type UserRole = "teacher" | "student";

export interface AuthUser {
  role: UserRole;
  studentId?: string;
  name: string;
  username?: string;
}

export type TransactionType = "add" | "remove";

export interface PointTransaction {
  id: string;
  studentId: string;
  amount: number;
  type: TransactionType;
  reason?: string;
  previousPoints: number;
  newPoints: number;
  createdAt: string;
}

export interface StudentWithStats extends Student {
  level: number;
  progressPercentage: number;
  pointsToNextLevel: number;
  pointsInCurrentLevel: number;
}

export interface ClassStats {
  classId: ClassId;
  className: string;
  totalStudents: number;
  totalPoints: number;
  averagePoints: number;
  averageLevel: number;
  averageProgress: number;
  topStudent?: StudentWithStats;
}

export interface DashboardStats {
  totalStudents: number;
  totalAccumulatedPoints: number;
  gradeCounts: Record<ClassId, number>;
  classStats: Record<ClassId, ClassStats>;
}

export interface LevelUpEvent {
  studentId: string;
  studentName: string;
  oldLevel: number;
  newLevel: number;
  timestamp: number;
}

export const QUICK_POINT_OPTIONS = [1, 5, 10, 20, 50] as const;

export const DEFAULT_REASONS = [
  "Participation",
  "Activity",
  "Challenge",
  "Teamwork",
  "Computer Activity",
  "Assignment",
  "Class Participation",
] as const;
