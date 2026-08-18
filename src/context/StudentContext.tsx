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
  }) => Promise<ClassInfo>;
  updateClass: (
    id: string,
    updates: Partial<Omit<ClassInfo, 'id' | 'createdAt'>>
  ) => Promise<ClassInfo>;
  deleteClass: (id: string) => Promise<boolean>;
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
  ) => Promise<StudentWithStats>;
  updateStudent: (
    id: string,
    updates: {
      name?: string;
      classId?: ClassId;
      username?: string;
      password?: string;
    }
  ) => Promise<StudentWithStats>;
  deleteStudent: (id: string) => Promise<boolean>;
  addPoints: (studentId: string, amount: number, reason?: string) => Promise<PointActionResult>;
  removePoints: (studentId: string, amount: number, reason?: string) => Promise<PointActionResult>;
  loadSampleData: () => Promise<void>;
  clearSampleData: () => Promise<void>;
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

  const refreshData = useCallback(async () => {
    try {
      const loadedClasses = await ClassService.getAllClasses();
      const enriched = await StudentService.getAllStudentsWithStats();
      const allTx = await PointsService.getAllTransactions();
      setClasses(loadedClasses);
      setStudents(enriched);
      setTransactions(allTx);
      setHasSampleData(SampleDataService.hasSampleData());
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
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
    async (params: {
      name: string;
      gradeNumber?: number;
      shortName?: string;
      color?: string;
      description?: string;
    }): Promise<ClassInfo> => {
      const created = await ClassService.createClass(params);
      await refreshData();
      return created;
    },
    [refreshData]
  );

  const updateClass = useCallback(
    async (
      id: string,
      updates: Partial<Omit<ClassInfo, 'id' | 'createdAt'>>
    ): Promise<ClassInfo> => {
      const updated = await ClassService.updateClass(id, updates);
      await refreshData();
      return updated;
    },
    [refreshData]
  );

  const deleteClass = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await ClassService.deleteClass(id);
      if (success) {
        await refreshData();
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
    async (
      paramsOrName:
        | string
        | {
            name: string;
            classId: ClassId;
            username?: string;
            password?: string;
          },
      optionalClassId?: ClassId
    ): Promise<StudentWithStats> => {
      let created: Student;
      if (typeof paramsOrName === 'string') {
        if (!optionalClassId) {
          throw new Error('Class ID is required');
        }
        created = await StudentService.createStudent({
          name: paramsOrName,
          classId: optionalClassId,
        });
      } else {
        created = await StudentService.createStudent(paramsOrName);
      }
      await refreshData();
      return (await StudentService.getStudentWithStatsById(created.id))!;
    },
    [refreshData]
  );

  const updateStudent = useCallback(
    async (
      id: string,
      updates: {
        name?: string;
        classId?: ClassId;
        username?: string;
        password?: string;
      }
    ): Promise<StudentWithStats> => {
      const updated = await StudentService.updateStudent(id, updates);
      await refreshData();
      return (await StudentService.getStudentWithStatsById(updated.id))!;
    },
    [refreshData]
  );

  const deleteStudent = useCallback(
    async (id: string): Promise<boolean> => {
      const success = await StudentService.deleteStudent(id);
      if (success) {
        await PointsService.deleteStudentTransactions(id);
        await refreshData();
      }
      return success;
    },
    [refreshData]
  );

  const addPoints = useCallback(
    async (studentId: string, amount: number, reason?: string): Promise<PointActionResult> => {
      const result = await PointsService.addPoints({ studentId, amount, reason });
      await refreshData();

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
    async (studentId: string, amount: number, reason?: string): Promise<PointActionResult> => {
      const result = await PointsService.removePoints({ studentId, amount, reason });
      await refreshData();
      return result;
    },
    [refreshData]
  );

  const loadSampleData = useCallback(async () => {
    SampleDataService.loadSampleData();
    await refreshData();
  }, [refreshData]);

  const clearSampleData = useCallback(async () => {
    SampleDataService.clearSampleData();
    await refreshData();
  }, [refreshData]);

  const clearAllData = useCallback(async () => {
    StorageService.clearAll();
    await refreshData();
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
