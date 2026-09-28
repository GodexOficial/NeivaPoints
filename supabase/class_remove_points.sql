-- Remove pontos de todos os alunos de uma turma em uma única transação.
-- Execute este arquivo uma vez no Supabase SQL Editor.
-- O saldo de cada aluno nunca fica abaixo de zero; remoções reais são registradas individualmente.

create or replace function public.remove_points_from_class(
  p_class_id text,
  p_amount integer,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student record;
  v_previous_points integer;
  v_removed_points integer;
  v_reason text;
  v_student_count integer := 0;
begin
  if p_class_id is null or btrim(p_class_id) = '' then
    raise exception 'Class ID is required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be a positive integer';
  end if;

  v_reason := nullif(btrim(p_reason), '');

  for v_student in
    select id, coalesce(points, 0)::integer as points
    from public.students
    where class_id = p_class_id
    order by id
    for update
  loop
    v_previous_points := v_student.points;
    v_removed_points := least(v_previous_points, p_amount);

    if v_removed_points = 0 then
      continue;
    end if;

    update public.students
    set points = v_previous_points - v_removed_points,
        updated_at = now()
    where id = v_student.id;

    insert into public.point_transactions (
      id,
      student_id,
      amount,
      type,
      reason,
      previous_points,
      new_points,
      created_at
    )
    values (
      'class_remove_xp_' || replace(gen_random_uuid()::text, '-', ''),
      v_student.id,
      v_removed_points,
      'remove',
      v_reason,
      v_previous_points,
      v_previous_points - v_removed_points,
      now()
    );

    v_student_count := v_student_count + 1;
  end loop;

  return jsonb_build_object(
    'studentCount', v_student_count,
    'amount', p_amount
  );
end;
$$;

grant execute on function public.remove_points_from_class(text, integer, text) to anon, authenticated;