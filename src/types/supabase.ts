export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          grade_number: number | null;
          short_name: string | null;
          color: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade_number?: number | null;
          short_name?: string | null;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          grade_number?: number | null;
          short_name?: string | null;
          color?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          name: string;
          username: string | null;
          password: string | null;
          class_id: string;
          points: number;
          created_at: string;
          updated_at: string;
          is_sample: boolean | null;
        };
        Insert: {
          id?: string;
          name: string;
          username?: string | null;
          password?: string | null;
          class_id: string;
          points?: number;
          created_at?: string;
          updated_at?: string;
          is_sample?: boolean | null;
        };
        Update: {
          id?: string;
          name?: string;
          username?: string | null;
          password?: string | null;
          class_id?: string;
          points?: number;
          created_at?: string;
          updated_at?: string;
          is_sample?: boolean | null;
        };
      };
      point_transactions: {
        Row: {
          id: string;
          student_id: string;
          amount: number;
          type: 'add' | 'remove';
          reason: string | null;
          previous_points: number;
          new_points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          amount: number;
          type: 'add' | 'remove';
          reason?: string | null;
          previous_points: number;
          new_points: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          amount?: number;
          type?: 'add' | 'remove';
          reason?: string | null;
          previous_points?: number;
          new_points?: number;
          created_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          name: string;
          email_or_username: string;
          password: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email_or_username: string;
          password: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email_or_username?: string;
          password?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
