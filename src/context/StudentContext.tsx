import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Student,
  StudentWithStats,
  PointTransaction,
  ClassId,
  ClassInfo,
  ClassStats,
  DashboardStats,
  LevelUpEvent,
} from '../types';
import { StudentService } from '../services/studentService';
import { PointsService } from '../services/pointsService';
import type { PointActionResult } from '../services/pointsService';
import { ClassService } from '../services/classService';
import { SampleDataService } from '../services/sampleData';
import { StorageService } from '../services/storage';

interface StudentContextType {
  classes: ClassInfo[];
  students: StudentWithStats[];
  transactions: PointTransaction[];
  hasSampleData: boolean;
  levelUpNotification: LevelUpEvent | null;
  dismissLevelUpNotification: () => void;
  dashboardStats: DashboardStats;
  getClassById: (id: string) => ClassInfo | undefined;
  addClass: (params: {
    name: string;
    gradeNumber?: number;
    shortName?: string;
    color?: string;
    description?: string;
  }) => ClassInfo;
  updateClass: (
    id: string,
    updates: Partial<Omit<ClassInfo, 'id' | 'createdAt'>>
  ) => ClassInfo;
  deleteClass: (id: string) => boolean;
  resetClassesToDefault: () => void;
  getStudentById: (id: string) => StudentWithStats | undefined;
  getStudentTransactions: (studentId: string) => PointTransaction[];
  getStudentsByClass: (classId: ClassId) => StudentWithStats[];
  getClassStats: (classId: ClassId) => ClassStats;
  getClassRanking: (classId: ClassId) => StudentWithStats[];
  addStudent: (
    paramsOrName:
      | string
      | {
          name: string;
          classId: ClassId;
          username?: string;
          password?: string;
        },
    optionalClassId?: ClassId
  ) => StudentWithStats;
  updateStudent: (
    id: string,
    updates: {
      name?: string;
      classId?: ClassId;
      username?: string;
      password?: string;
    }
  ) => StudentWithStats;
  deleteStudent: (id: string) => boolean;
  addPoints: (studentId: string, amount: number, reason?: string) => PointActionResult;
  removePoints: (studentId: string, amount: number, reason?: string) => PointActionResult;
  loadSampleData: () => void;
  clearSampleData: () => void;
  clearAllData: () => void;
  refreshData: () => void;
}

const StudentContext = createContext<StudentContextType | null>(null);

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [levelUpNotification, setLevelUpNotification] = useState<LevelUpEvent | null>(null);
  const [hasSampleData, setHasSampleData] = useState<boolean>(false);

  const refreshData = useCallback(() => {
    const loadedClasses = ClassService.getAllClasses();
    const enriched = StudentService.getAllStudentsWithStats();
    const allTx = PointsService.getAllTransactions();
    setClasses(loadedClasses);
    setStudents(enriched);
    setTransactions(allTx);
    setHasSampleData(SampleDataService.hasSampleData());
  }, []);

  // Initialize data on mount
  useEffect(() => {
    // Check if initial storage is empty; if completely fresh, we do not force sample data
    // but we check if sample data is present
    refreshData();
  }, [refreshData]);

  const dismissLevelUpNotification = useCallback(() => {
    setLevelUpNotification(null);
  }, []);

  const getClassById = useCallback(
    (id: string): ClassInfo | undefined => {
      return classes.find((c) => c.id === id);
    },
    [classes]
  );

  const addClass = useCallback(
    (params: {
      name: string;
      gradeNumber?: number;
      shortName?: string;
      color?: string;
      description?: string;
    }): ClassInfo => {
      const created = ClassService.createClass(params);
      refreshData();
      return created;
    },
    [refreshData]
  );

  const updateClass = useCallback(
    (
      id: string,
      updates: Partial<Omit<ClassInfo, 'id' | 'createdAt'>>
    ): ClassInfo => {
      const updated = ClassService.updateClass(id, updates);
      refreshData();
      return updated;
    },
    [refreshData]
  );

  const deleteClass = useCallback(
    (id: string): boolean => {
      const success = ClassService.deleteClass(id);
      if (success) {
        refreshData();
      }
      return success;
    },
    [refreshData]
  );

  const resetClassesToDefault = useCallback(() => {
    ClassService.resetToDefaultClasses();
    refreshData();
  }, [refreshData]);

  const getStudentById = useCallback(
    (id: string): StudentWithStats | undefined => {
      return students.find((s) => s.id === id);
    },
    [students]
  );

  const getStudentTransactions = useCallback(
    (studentId: string): PointTransaction[] => {
      return transactions.filter((t) => t.studentId === studentId);
    },
    [transactions]
  );

  const getStudentsByClass = useCallback(
    (classId: ClassId): StudentWithStats[] => {
      return students.filter((s) => s.classId === classId);
    },
    [students]
  );

  const getClassRanking = useCallback(
    (classId: ClassId): StudentWithStats[] => {
      const classStudents = students.filter((s) => s.classId === classId);
      return [...classStudents].sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }
        return a.name.localeCompare(b.name);
      });
    },
    [students]
  );

  const getClassStats = useCallback(
    (classId: ClassId): ClassStats => {
      const classStudents = students.filter((s) => s.classId === classId);
      const totalStudents = classStudents.length;
      const totalPoints = classStudents.reduce((sum, s) => sum + s.points, 0);
      const totalLevels = classStudents.reduce((sum, s) => sum + s.level, 0);
      const totalProgress = classStudents.reduce((sum, s) => sum + s.progressPercentage, 0);

      const averagePoints = totalStudents > 0 ? Math.round((totalPoints / totalStudents) * 10) / 10 : 0;
      const averageLevel = totalStudents > 0 ? Math.round((totalLevels / totalStudents) * 10) / 10 : 0;
      const averageProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;

      const ranked = [...classStudents].sort((a, b) => b.points - a.points);
      const topStudent = ranked.length > 0 ? ranked[0] : undefined;

      const foundClass = classes.find((c) => c.id === classId);

      return {
        classId,
        className: foundClass?.name || classId,
        totalStudents,
        totalPoints,
        averagePoints,
        averageLevel,
        averageProgress,
        topStudent,
      };
    },
    [students, classes]
  );

  const dashboardStats = useMemo<DashboardStats>(() => {
    const totalStudents = students.length;
    const totalAccumulatedPoints = students.reduce((sum, s) => sum + s.points, 0);

    const gradeCounts: Record<string, number> = {};
    const classStats: Record<string, ClassStats> = {};

    classes.forEach((c) => {
      const cStudents = students.filter((s) => s.classId === c.id);
      gradeCounts[c.id] = cStudents.length;

      const cTotalPoints = cStudents.reduce((sum, s) => sum + s.points, 0);
      const cTotalLevels = cStudents.reduce((sum, s) => sum + s.level, 0);
      const cTotalProgress = cStudents.reduce((sum, s) => sum + s.progressPercentage, 0);

      const ranked = [...cStudents].sort((a, b) => b.points - a.points);

      classStats[c.id] = {
        classId: c.id,
        className: c.name,
        totalStudents: cStudents.length,
        totalPoints: cTotalPoints,
        averagePoints: cStudents.length > 0 ? Math.round((cTotalPoints / cStudents.length) * 10) / 10 : 0,
        averageLevel: cStudents.length > 0 ? Math.round((cTotalLevels / cStudents.length) * 10) / 10 : 0,
        averageProgress: cStudents.length > 0 ? Math.round(cTotalProgress / cStudents.length) : 0,
        topStudent: ranked.length > 0 ? ranked[0] : undefined,
      };
    });

    return {
      totalStudents,
      totalAccumulatedPoints,
      gradeCounts,
      classStats,
    };
  }, [students, classes]);

  const addStudent = useCallback(
    (
      paramsOrName:
        | string
        | {
            name: string;
            classId: ClassId;
            username?: string;
            password?: string;
          },
      optionalClassId?: ClassId
    ): StudentWithStats => {
      let created: Student;
      if (typeof paramsOrName === 'string') {
        if (!optionalClassId) {
          throw new Error('Class ID is required');
        }
        created = StudentService.createStudent({
          name: paramsOrName,
          classId: optionalClassId,
        });
      } else {
        created = StudentService.createStudent(paramsOrName);
      }
      refreshData();
      return StudentService.getStudentWithStatsById(created.id)!;
    },
    [refreshData]
  );

  const updateStudent = useCallback(
    (
      id: string,
      updates: {
        name?: string;
        classId?: ClassId;
        username?: string;
        password?: string;
      }
    ): StudentWithStats => {
      const updated = StudentService.updateStudent(id, updates);
      refreshData();
      return StudentService.getStudentWithStatsById(updated.id)!;
    },
    [refreshData]
  );

  const deleteStudent = useCallback(
    (id: string): boolean => {
      const success = StudentService.deleteStudent(id);
      if (success) {
        PointsService.deleteStudentTransactions(id);
        refreshData();
      }
      return success;
    },
    [refreshData]
  );

  const addPoints = useCallback(
    (studentId: string, amount: number, reason?: string): PointActionResult => {
      const result = PointsService.addPoints({ studentId, amount, reason });
      refreshData();

      if (result.leveledUp) {
        setLevelUpNotification({
          studentId: result.student.id,
          studentName: result.student.name,
          oldLevel: result.oldLevel,
          newLevel: result.newLevel,
          timestamp: Date.now(),
        });
      }

      return result;
    },
    [refreshData]
  );

  const removePoints = useCallback(
    (studentId: string, amount: number, reason?: string): PointActionResult => {
      const result = PointsService.removePoints({ studentId, amount, reason });
      refreshData();
      return result;
    },
    [refreshData]
  );

  const loadSampleData = useCallback(() => {
    SampleDataService.loadSampleData();
    refreshData();
  }, [refreshData]);

  const clearSampleData = useCallback(() => {
    SampleDataService.clearSampleData();
    refreshData();
  }, [refreshData]);

  const clearAllData = useCallback(() => {
    StorageService.clearAll();
    refreshData();
  }, [refreshData]);

  const value = useMemo(
    () => ({
      classes,
      students,
      transactions,
      hasSampleData,
      levelUpNotification,
      dismissLevelUpNotification,
      dashboardStats,
      getClassById,
      addClass,
      updateClass,
      deleteClass,
      resetClassesToDefault,
      getStudentById,
      getStudentTransactions,
      getStudentsByClass,
      getClassStats,
      getClassRanking,
      addStudent,
      updateStudent,
      deleteStudent,
      addPoints,
      removePoints,
      loadSampleData,
      clearSampleData,
      clearAllData,
      refreshData,
    }),
    [
      classes,
      students,
      transactions,
      hasSampleData,
      levelUpNotification,
      dismissLevelUpNotification,
      dashboardStats,
      getClassById,
      addClass,
      updateClass,
      deleteClass,
      resetClassesToDefault,
      getStudentById,
      getStudentTransactions,
      getStudentsByClass,
      getClassStats,
      getClassRanking,
      addStudent,
      updateStudent,
      deleteStudent,
      addPoints,
      removePoints,
      loadSampleData,
      clearSampleData,
      clearAllData,
      refreshData,
    ]
  );

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
};

export const useStudentContext = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudentContext must be used within a StudentProvider');
  }
  return context;
};
