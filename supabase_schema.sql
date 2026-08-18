-- Supabase Schema for School Points Tracker System

-- 1. Create 'classes' table
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade_number INTEGER,
  short_name TEXT,
  color TEXT DEFAULT 'blue',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create 'students' table
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  password TEXT DEFAULT '123456',
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0 CHECK (points >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_sample BOOLEAN DEFAULT FALSE
);

-- 3. Create 'point_transactions' table
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('add', 'remove')),
  reason TEXT,
  previous_points INTEGER NOT NULL CHECK (previous_points >= 0),
  new_points INTEGER NOT NULL CHECK (new_points >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create 'teachers' table
CREATE TABLE IF NOT EXISTS public.teachers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email_or_username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create Policies for Anon/Public Access (Permissive for system read/write with anon key)
CREATE POLICY "Allow public read access to classes" ON public.classes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to classes" ON public.classes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to classes" ON public.classes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to classes" ON public.classes FOR DELETE USING (true);

CREATE POLICY "Allow public read access to students" ON public.students FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to students" ON public.students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to students" ON public.students FOR DELETE USING (true);

CREATE POLICY "Allow public read access to point_transactions" ON public.point_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to point_transactions" ON public.point_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to point_transactions" ON public.point_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to point_transactions" ON public.point_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read access to teachers" ON public.teachers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to teachers" ON public.teachers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to teachers" ON public.teachers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to teachers" ON public.teachers FOR DELETE USING (true);

-- Insert Default Classes if not present
INSERT INTO public.classes (id, name, grade_number, short_name, color, description)
VALUES
  ('6th-grade', '6th Grade', 6, '6th', 'blue', '6th Grade Academic Class'),
  ('7th-grade', '7th Grade', 7, '7th', 'indigo', '7th Grade Academic Class'),
  ('8th-grade', '8th Grade', 8, '8th', 'purple', '8th Grade Academic Class'),
  ('9th-grade', '9th Grade', 9, '9th', 'violet', '9th Grade Academic Class')
ON CONFLICT (id) DO NOTHING;

-- Insert Default Teacher
INSERT INTO public.teachers (id, name, email_or_username, password)
VALUES ('teacher_default_01', 'Teacher Admin', 'teacher', 'admin123')
ON CONFLICT (id) DO NOTHING;
