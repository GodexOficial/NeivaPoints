-- XP por login/presença. Execute uma vez no Supabase SQL Editor.
-- Esta migração pressupõe as tabelas existentes: students, point_transactions e app_settings.
-- Janela permitida: todos os dias, de 13:00 até 18:15 no horário de Fortaleza.

create extension if not exists pgcrypto;

insert into public.app_settings (key, value)
values
  ('login_xp_per_minute', '2'),
  ('login_xp_confirmation_minutes', '10'),
  ('monthly_xp_goal', '100'),
  ('login_xp_start_time', '13:00'),
  ('login_xp_end_time', '18:15')
on conflict (key) do nothing;

-- O valor de dez minutos é aplicado somente na instalação inicial; valores salvos são preservados.

create table if not exists public.login_xp_sessions (
  session_id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  next_award_at timestamptz not null default now() + interval '1 minute',
  active_until timestamptz not null,
  last_awarded_at timestamptz,
  closed_at timestamptz
);

create index if not exists login_xp_sessions_active_idx
  on public.login_xp_sessions (student_id, active_until desc)
  where closed_at is null;

alter table public.login_xp_sessions enable row level security;
revoke all on public.login_xp_sessions from anon, authenticated;

-- Cria uma sessão cujo primeiro crédito só fica disponível após um minuto.
-- A trava consultiva serializa inícios simultâneos do mesmo aluno, mesmo em abas diferentes.
-- Remova a versão anterior para permitir instalações antigas com retorno text.
drop function if exists public.start_login_xp_session(text);
drop function if exists public.confirm_login_xp_activity(uuid);

create or replace function public.start_login_xp_session(p_student_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_session_id uuid;
  v_active_until timestamptz;
  v_confirmation_minutes integer;
  v_start_time time;
  v_end_time time;
begin
  if p_student_id is null or btrim(p_student_id) = '' then
    raise exception 'Student ID is required';
  end if;

    select coalesce(max(value) filter (where key = 'login_xp_start_time'), '13:00')::time,
        coalesce(max(value) filter (where key = 'login_xp_end_time'), '18:15')::time
    into v_start_time, v_end_time
    from app_settings
    where key in ('login_xp_start_time', 'login_xp_end_time');

    if (now() at time zone 'America/Fortaleza')::time < v_start_time
      or (now() at time zone 'America/Fortaleza')::time >= v_end_time then
    return jsonb_build_object('reason', 'outside_schedule');
  end if;

  perform pg_advisory_xact_lock(hashtext(p_student_id));
  select active_until into v_active_until
  from login_xp_sessions
  where student_id = p_student_id and closed_at is null and active_until > now()
  order by active_until desc
  limit 1
  for update;

  if found then
    return jsonb_build_object('reason', 'session_active', 'activeUntil', v_active_until);
  end if;

  select greatest(1, coalesce(value::integer, 5)) into v_confirmation_minutes
  from app_settings where key = 'login_xp_confirmation_minutes';
  v_confirmation_minutes := coalesce(v_confirmation_minutes, 5);

  insert into login_xp_sessions (student_id, active_until)
  values (p_student_id, now() + make_interval(mins => v_confirmation_minutes))
  returning session_id, active_until into v_session_id, v_active_until;
  return jsonb_build_object('sessionId', v_session_id::text, 'activeUntil', v_active_until);
end;
$$;

create or replace function public.get_login_xp_session_status(p_student_id text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_active_until timestamptz;
begin
  select active_until into v_active_until
  from login_xp_sessions
  where student_id = p_student_id and closed_at is null and active_until > now()
  order by active_until desc
  limit 1;

  return jsonb_build_object(
    'locked', v_active_until is not null,
    'activeUntil', v_active_until
  );
end;
$$;

-- Confirma atividade e abre uma nova janela de presença. Não concede XP por si só.
create function public.confirm_login_xp_activity(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_confirmation_minutes integer;
  v_start_time time;
  v_end_time time;
begin
  select coalesce(max(value) filter (where key = 'login_xp_start_time'), '13:00')::time,
         coalesce(max(value) filter (where key = 'login_xp_end_time'), '18:15')::time
  into v_start_time, v_end_time
  from app_settings
  where key in ('login_xp_start_time', 'login_xp_end_time');

  if (now() at time zone 'America/Fortaleza')::time < v_start_time
     or (now() at time zone 'America/Fortaleza')::time >= v_end_time then
    return jsonb_build_object('allowed', false, 'reason', 'outside_schedule');
  end if;
  select greatest(1, coalesce(value::integer, 5)) into v_confirmation_minutes
  from app_settings where key = 'login_xp_confirmation_minutes';
  update login_xp_sessions
  set last_confirmed_at = now(), active_until = now() + make_interval(mins => coalesce(v_confirmation_minutes, 5))
  where session_id = p_session_id and closed_at is null;
  if not found then return jsonb_build_object('allowed', false, 'reason', 'invalid_session'); end if;
  return jsonb_build_object('allowed', true);
end;
$$;

-- Crédito atômico: uma chamada repetida, aba duplicada ou relógio alterado não gera XP extra.
create or replace function public.claim_login_xp(p_session_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_session login_xp_sessions%rowtype;
  v_xp integer;
  v_previous_points integer;
  v_new_points integer;
  v_start_time time;
  v_end_time time;
begin
  select coalesce(max(value) filter (where key = 'login_xp_start_time'), '13:00')::time,
         coalesce(max(value) filter (where key = 'login_xp_end_time'), '18:15')::time
  into v_start_time, v_end_time
  from app_settings
  where key in ('login_xp_start_time', 'login_xp_end_time');

  if (now() at time zone 'America/Fortaleza')::time < v_start_time
     or (now() at time zone 'America/Fortaleza')::time >= v_end_time then
    return jsonb_build_object('awarded', false, 'reason', 'outside_schedule');
  end if;
  select * into v_session from login_xp_sessions where session_id = p_session_id for update;
  if not found or v_session.closed_at is not null then
    return jsonb_build_object('awarded', false, 'reason', 'invalid_session');
  end if;
  if now() >= v_session.active_until then
    update login_xp_sessions set closed_at = now() where session_id = p_session_id;
    return jsonb_build_object('awarded', false, 'reason', 'confirmation_required');
  end if;
  if now() < v_session.next_award_at then
    return jsonb_build_object('awarded', false, 'reason', 'too_early');
  end if;

  select greatest(1, coalesce(value::integer, 2)) into v_xp
  from app_settings where key = 'login_xp_per_minute';
  v_xp := coalesce(v_xp, 2);

  select points into v_previous_points from students where id = v_session.student_id for update;
  if not found then return jsonb_build_object('awarded', false, 'reason', 'student_not_found'); end if;
  v_new_points := v_previous_points + v_xp;
  update students set points = v_new_points, updated_at = now() where id = v_session.student_id;
  insert into point_transactions (id, student_id, amount, type, reason, previous_points, new_points, created_at)
  values ('login_xp_' || replace(gen_random_uuid()::text, '-', ''), v_session.student_id, v_xp, 'add', 'XP por presença', v_previous_points, v_new_points, now());
  update login_xp_sessions
  set last_awarded_at = now(), next_award_at = now() + interval '1 minute'
  where session_id = p_session_id;
  return jsonb_build_object('awarded', true, 'amount', v_xp);
end;
$$;

grant execute on function public.start_login_xp_session(text) to anon, authenticated;
grant execute on function public.get_login_xp_session_status(text) to anon, authenticated;
grant execute on function public.confirm_login_xp_activity(uuid) to anon, authenticated;
grant execute on function public.claim_login_xp(uuid) to anon, authenticated;
