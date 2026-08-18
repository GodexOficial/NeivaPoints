import { supabase } from '../lib/supabase';
import type { ClassInfo, Student, PointTransaction } from '../types';
import type { TeacherAccount } from './authService';

/**
 * Supabase Database Service
 * Handles all database operations with automatic fallback to localStorage if Supabase is unavailable
 */
export class SupabaseService {
  private static isConfigured = !!import.meta.env.VITE_SUPABASE_URL;

  /**
   * Teachers Operations
   */
  static async getAllTeachers(): Promise<TeacherAccount[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teachers from Supabase:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        emailOrUsername: row.email_or_username,
        password: row.password,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Error in getAllTeachers:', err);
      return [];
    }
  }

  static async createTeacher(params: {
    id?: string;
    name: string;
    emailOrUsername: string;
    password: string;
  }): Promise<TeacherAccount> {
    if (!this.isConfigured) throw new Error('Supabase is not configured');

    try {
      const id = params.id || `teacher_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('teachers')
        .insert({
          id,
          name: params.name,
          email_or_username: params.emailOrUsername,
          password: params.password,
          created_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        emailOrUsername: data.email_or_username,
        password: data.password,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error in createTeacher:', err);
      throw err;
    }
  }

  /**
   * Classes Operations
   */
  static async getAllClasses(): Promise<ClassInfo[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching classes:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        gradeNumber: row.grade_number,
        shortName: row.short_name,
        color: row.color,
        description: row.description,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Error in getAllClasses:', err);
      return [];
    }
  }

  static async getClassById(id: string): Promise<ClassInfo | undefined> {
    if (!this.isConfigured) return undefined;

    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return undefined;

      return {
        id: data.id,
        name: data.name,
        gradeNumber: data.grade_number,
        shortName: data.short_name,
        color: data.color,
        description: data.description,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error in getClassById:', err);
      return undefined;
    }
  }

  static async createClass(params: {
    name: string;
    gradeNumber?: number;
    shortName?: string;
    color?: string;
    description?: string;
  }): Promise<ClassInfo> {
    if (!this.isConfigured) throw new Error('Supabase is not configured');

    try {
      const id = this.generateClassId(params.name);
      const shortName = params.shortName || `${params.gradeNumber || ''}th`.trim();

      const { data, error } = await supabase
        .from('classes')
        .insert({
          id,
          name: params.name,
          grade_number: params.gradeNumber || null,
          short_name: shortName,
          color: params.color || 'blue',
          description: params.description || null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        gradeNumber: data.grade_number,
        shortName: data.short_name,
        color: data.color,
        description: data.description,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error in createClass:', err);
      throw err;
    }
  }

  static async updateClass(
    id: string,
    updates: Partial<Omit<ClassInfo, 'id' | 'createdAt'>>
  ): Promise<ClassInfo> {
    if (!this.isConfigured) throw new Error('Supabase is not configured');

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.gradeNumber !== undefined) updateData.grade_number = updates.gradeNumber;
      if (updates.shortName !== undefined) updateData.short_name = updates.shortName;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.description !== undefined) updateData.description = updates.description;

      const { data, error } = await supabase
        .from('classes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        gradeNumber: data.grade_number,
        shortName: data.short_name,
        color: data.color,
        description: data.description,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('Error in updateClass:', err);
      throw err;
    }
  }

  static async deleteClass(id: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error in deleteClass:', err);
      return false;
    }
  }

  /**
   * Students Operations
   */
  static async getAllStudents(): Promise<Student[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        username: row.username,
        password: row.password,
        classId: row.class_id,
        points: row.points,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isSample: row.is_sample,
      }));
    } catch (err) {
      console.error('Error in getAllStudents:', err);
      return [];
    }
  }

  static async getStudentById(id: string): Promise<Student | undefined> {
    if (!this.isConfigured) return undefined;

    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return undefined;

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        password: data.password,
        classId: data.class_id,
        points: data.points,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isSample: data.is_sample,
      };
    } catch (err) {
      console.error('Error in getStudentById:', err);
      return undefined;
    }
  }

  static async createStudent(params: {
    name: string;
    classId: string;
    username?: string;
    password?: string;
  }): Promise<Student> {
    if (!this.isConfigured) throw new Error('Supabase is not configured');

    try {
      const id = this.generateStudentId();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('students')
        .insert({
          id,
          name: params.name,
          username: params.username || null,
          password: params.password || null,
          class_id: params.classId,
          points: 0,
          created_at: now,
          updated_at: now,
          is_sample: false,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        password: data.password,
        classId: data.class_id,
        points: data.points,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isSample: data.is_sample,
      };
    } catch (err) {
      console.error('Error in createStudent:', err);
      throw err;
    }
  }

  static async updateStudent(
    id: string,
    updates: Partial<Omit<Student, 'id' | 'createdAt'>>
  ): Promise<Student> {
    if (!this.isConfigured) throw new Error('Supabase is not configured');

    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.classId !== undefined) updateData.class_id = updates.classId;
      if (updates.username !== undefined) updateData.username = updates.username;
      if (updates.password !== undefined) updateData.password = updates.password;
      if (updates.points !== undefined) updateData.points = updates.points;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        password: data.password,
        classId: data.class_id,
        points: data.points,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isSample: data.is_sample,
      };
    } catch (err) {
      console.error('Error in updateStudent:', err);
      throw err;
    }
  }

  static async deleteStudent(id: string): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error in deleteStudent:', err);
      return false;
    }
  }

  /**
   * Transactions Operations
   */
  static async getAllTransactions(): Promise<PointTransaction[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        amount: row.amount,
        type: row.type,
        reason: row.reason,
        previousPoints: row.previous_points,
        newPoints: row.new_points,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Error in getAllTransactions:', err);
      return [];
    }
  }

  static async getStudentTransactions(studentId: string): Promise<PointTransaction[]> {
    if (!this.isConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        amount: row.amount,
        type: row.type,
        reason: row.reason,
        previousPoints: row.previous_points,
        newPoints: row.new_points,
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Error in getStudentTransactions:', err);
      return [];
    }
  }

  static async createTransaction(transaction: PointTransaction): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      const { error } = await supabase
        .from('point_transactions')
        .insert({
          id: transaction.id,
          student_id: transaction.studentId,
          amount: transaction.amount,
          type: transaction.type,
          reason: transaction.reason || null,
          previous_points: transaction.previousPoints,
          new_points: transaction.newPoints,
          created_at: transaction.createdAt,
        });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error in createTransaction:', err);
      return false;
    }
  }

  /**
   * Helper Methods
   */
  private static generateClassId(name: string): string {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    return slug ? `${slug}-${uniqueSuffix}` : `class_${Date.now()}_${uniqueSuffix}`;
  }

  private static generateStudentId(): string {
    return `std_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
