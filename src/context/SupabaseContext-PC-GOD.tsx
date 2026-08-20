import React, { createContext, useContext, useEffect, useState } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import type { Student, ClassInfo } from '../types';

interface SupabaseContextType {
  // Classes
  classes: ClassInfo[];
  loadingClasses: boolean;
  refreshClasses: () => Promise<void>;

  // Students
  students: Student[];
  loadingStudents: boolean;
  refreshStudents: () => Promise<void>;

  // Operations
  isSupabaseEnabled: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const isSupabaseEnabled = isSupabaseConfigured;

  const refreshClasses = async () => {
    if (!isSupabaseEnabled) return;
    setLoadingClasses(true);
    try {
      const data = await SupabaseService.getAllClasses();
      setClasses(data);
    } catch (err) {
      console.error('Error refreshing classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const refreshStudents = async () => {
    if (!isSupabaseEnabled) return;
    setLoadingStudents(true);
    try {
      const data = await SupabaseService.getAllStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error refreshing students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (isSupabaseEnabled) {
      refreshClasses();
      refreshStudents();
    }
  }, [isSupabaseEnabled]);

  return (
    <SupabaseContext.Provider
      value={{
        classes,
        loadingClasses,
        refreshClasses,
        students,
        loadingStudents,
        refreshStudents,
        isSupabaseEnabled,
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase deve ser usado dentro de SupabaseProvider');
  }
  return context;
};
