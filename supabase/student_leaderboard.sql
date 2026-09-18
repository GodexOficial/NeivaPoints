-- Consulta pública mínima para o leaderboard do portal do aluno.
-- Execute uma vez no Supabase SQL Editor.
-- A função não expõe username, senha ou demais campos de students.

create or replace function public.get_student_leaderboard()
returns table (
  student_id text,
  student_name text,
  class_id text,
  class_name text,
  points integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id as student_id,
    s.name as student_name,
    s.class_id,
    coalesce(c.name, s.class_id) as class_name,
    greatest(0, coalesce(s.points, 0))::integer as points
  from public.students s
  left join public.classes c on c.id = s.class_id
  order by greatest(0, coalesce(s.points, 0)) desc, lower(s.name), s.id;
$$;

revoke all on function public.get_student_leaderboard() from public;
grant execute on function public.get_student_leaderboard() to anon, authenticated;
