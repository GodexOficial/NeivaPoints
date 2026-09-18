import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { StudentWithStats } from '../types';

export interface LeaderboardStudent {
  id: string;
  name: string;
  classId: string;
  className: string;
  points: number;
}

export class LeaderboardService {
  static async getStudents(fallbackStudents: StudentWithStats[]): Promise<LeaderboardStudent[]> {
    if (!isSupabaseConfigured) {
      return fallbackStudents.map((student) => ({
        id: student.id,
        name: student.name,
        classId: student.classId,
        className: student.classId,
        points: Math.max(0, Math.floor(student.points || 0)),
      }));
    }

    const { data, error } = await supabase.rpc('get_student_leaderboard');
    if (error) throw error;

    return ((data || []) as Array<{
      student_id: string;
      student_name: string;
      class_id: string;
      class_name: string;
      points: number;
    }>).map((row) => ({
      id: row.student_id,
      name: row.student_name,
      classId: row.class_id,
      className: row.class_name,
      points: Math.max(0, Math.floor(row.points || 0)),
    }));
  }
}
