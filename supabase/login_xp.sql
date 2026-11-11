-- XP por presença v2. Copie TODO este arquivo no SQL Editor do projeto do site.
-- Atualização transacional e reaplicável: não apaga alunos, pontos ou histórico.
-- Requer as tabelas existentes students, point_transactions e app_settings.
-- Esta atualização protege os créditos destas RPCs, mas NÃO substitui Supabase
-- Auth nem corrige as políticas públicas gerais de escrita das outras tabelas.
begin;

insert into public.app_settings(key,value) values
 ('login_xp_per_minute','2'), ('login_xp_confirmation_minutes','10'),
 ('monthly_xp_goal','100'), ('login_xp_start_time','13:00'), ('login_xp_end_time','18:15')
on conflict(key) do nothing;

create table if not exists public.login_xp_sessions (
 session_id uuid primary key default gen_random_uuid(),
 student_id text not null references public.students(id) on delete cascade,
 started_at timestamptz not null default now(), last_confirmed_at timestamptz not null default now(),
 next_award_at timestamptz not null default now()+interval '1 minute',
 active_until timestamptz not null, last_awarded_at timestamptz, closed_at timestamptz
);
alter table public.login_xp_sessions add column if not exists xp_per_minute integer;
create index if not exists login_xp_sessions_active_idx on public.login_xp_sessions(student_id,active_until desc) where closed_at is null;
create table if not exists public.login_xp_credit_limits (
 student_id text primary key references public.students(id) on delete cascade,
 last_credited_until timestamptz not null
);
alter table public.login_xp_sessions enable row level security;
alter table public.login_xp_credit_limits enable row level security;
revoke all on public.login_xp_sessions, public.login_xp_credit_limits from public, anon, authenticated;

create or replace function public.login_xp_config() returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_xp text; v_minutes text; v_start text; v_end text;
begin
 select max(value) filter(where key='login_xp_per_minute'),max(value) filter(where key='login_xp_confirmation_minutes'),
 max(value) filter(where key='login_xp_start_time'),max(value) filter(where key='login_xp_end_time')
 into v_xp,v_minutes,v_start,v_end from public.app_settings;
 if v_start is null or v_start !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then v_start:='13:00'; end if;
 if v_end is null or v_end !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then v_end:='18:15'; end if;
 if v_start>=v_end then v_start:='13:00'; v_end:='18:15'; end if;
 return jsonb_build_object('xpPerMinute',case when v_xp ~ '^[0-9]{1,5}$' then greatest(1,least(10000,v_xp::integer)) else 2 end,
 'confirmationMinutes',case when v_minutes ~ '^[0-9]{1,6}$' then greatest(1,least(120,v_minutes::integer)) else 10 end,
 'startTime',v_start,'endTime',v_end);
end; $$;
revoke all on function public.login_xp_config() from public,anon,authenticated;
update public.login_xp_sessions set xp_per_minute=(public.login_xp_config()->>'xpPerMinute')::integer where xp_per_minute is null;
alter table public.login_xp_sessions alter column xp_per_minute set default 2;
alter table public.login_xp_sessions alter column xp_per_minute set not null;
insert into public.login_xp_credit_limits(student_id,last_credited_until)
select student_id,max(last_awarded_at) from public.login_xp_sessions where last_awarded_at is not null group by student_id
on conflict(student_id) do update set last_credited_until=greatest(login_xp_credit_limits.last_credited_until,excluded.last_credited_until);

-- Retorna apenas o estado necessário à interface; não concede pontos.
create or replace function public.login_xp_snapshot(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.login_xp_sessions%rowtype; v_now timestamptz:=clock_timestamp(); v_points integer;
begin
 select * into s from public.login_xp_sessions where session_id=p_session_id;
 if not found then return jsonb_build_object('version',2,'locked',false,'reason','invalid_session','serverNow',v_now); end if;
 select points into v_points from public.students where id=s.student_id;
 return jsonb_build_object('version',2,'sessionId',s.session_id,'startedAt',s.started_at,'activeUntil',s.active_until,
 'nextAwardAt',s.next_award_at,'serverNow',v_now,'xpPerMinute',s.xp_per_minute,'points',v_points,
 'locked',s.closed_at is null and v_now<s.active_until,
 'claimable',s.closed_at is null and s.next_award_at<=least(v_now,s.active_until),
 'closed',s.closed_at is not null);
end; $$;
revoke all on function public.login_xp_snapshot(uuid) from public,anon,authenticated;

create or replace function public.get_login_xp_session_status(p_student_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_points integer;
begin
 select session_id into v_id from public.login_xp_sessions where student_id=p_student_id
 order by started_at desc,session_id desc limit 1;
 if v_id is not null then return public.login_xp_snapshot(v_id); end if;
 select points into v_points from public.students where id=p_student_id;
 return jsonb_build_object('version',2,'locked',false,'claimable',false,'serverNow',clock_timestamp(),'points',v_points);
end; $$;

-- Uma única transação trava o aluno ANTES da sessão: abas, retries e sessões
-- antigas compartilham a mesma ordem de trava e o mesmo limite de crédito.
create or replace function public.claim_login_xp(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.login_xp_sessions%rowtype; v_student text; v_previous integer; v_points integer;
 v_now timestamptz; v_limit timestamptz; v_next timestamptz; v_last timestamptz; v_count integer; v_amount integer;
 v_config jsonb; v_day_end timestamptz;
begin
 select student_id into v_student from public.login_xp_sessions where session_id=p_session_id;
 if not found then return jsonb_build_object('version',2,'awarded',false,'reason','invalid_session','serverNow',clock_timestamp()); end if;
 select points into v_previous from public.students where id=v_student for update;
 if not found then return jsonb_build_object('version',2,'awarded',false,'reason','student_not_found','serverNow',clock_timestamp()); end if;
 select * into s from public.login_xp_sessions where session_id=p_session_id for update;
 v_now:=clock_timestamp();
 if s.closed_at is not null then return public.login_xp_snapshot(s.session_id)||jsonb_build_object('awarded',false,'reason','confirmation_required','amount',0); end if;
 v_config:=public.login_xp_config();
 -- O limite também respeita o fim do horário configurado, inclusive para sessões antigas.
 v_day_end:=((s.started_at at time zone 'America/Fortaleza')::date+(v_config->>'endTime')::time) at time zone 'America/Fortaleza';
 if (s.started_at at time zone 'America/Fortaleza')::time < (v_config->>'startTime')::time then
   update public.login_xp_sessions set closed_at=v_now where session_id=s.session_id;
   return public.login_xp_snapshot(s.session_id)||jsonb_build_object('awarded',false,'reason','outside_schedule','amount',0);
 end if;
 v_limit:=least(v_now,s.active_until,v_day_end);
 select last_credited_until into v_last from public.login_xp_credit_limits where student_id=v_student;
 v_next:=greatest(s.next_award_at,coalesce(v_last+interval '1 minute',s.next_award_at));
 v_count:=greatest(0,floor(extract(epoch from (v_limit-v_next))/60)::integer+1);
 -- Sessões v2 duram no máximo 120 minutos; protege também dados antigos anormais.
 v_count:=least(v_count,120);
 if v_count=0 then
   if v_now>=least(s.active_until,v_day_end) then update public.login_xp_sessions set closed_at=v_now where session_id=s.session_id; end if;
   return public.login_xp_snapshot(s.session_id)||jsonb_build_object('awarded',false,'amount',0,
     'reason',case when v_now>=least(s.active_until,v_day_end) then 'confirmation_required' else 'too_early' end);
 end if;
 v_last:=v_next+make_interval(mins=>v_count-1);
 v_amount:=v_count*greatest(1,least(10000,s.xp_per_minute)); v_points:=v_previous+v_amount;
 insert into public.point_transactions(id,student_id,amount,type,reason,previous_points,new_points,created_at)
 values('login_xp_v2_'||replace(s.session_id::text,'-','')||'_'||floor(extract(epoch from v_last))::bigint::text,
 v_student,v_amount,'add','XP por presença ('||v_count||case when v_count=1 then ' minuto)' else ' minutos)' end,v_previous,v_points,v_now);
 update public.students set points=v_points,updated_at=v_now where id=v_student;
 insert into public.login_xp_credit_limits(student_id,last_credited_until) values(v_student,v_last)
 on conflict(student_id) do update set last_credited_until=greatest(login_xp_credit_limits.last_credited_until,excluded.last_credited_until);
 update public.login_xp_sessions set last_awarded_at=v_now,next_award_at=v_last+interval '1 minute',
 closed_at=case when v_now>=least(active_until,v_day_end) and v_last+interval '1 minute'>least(active_until,v_day_end) then v_now else null end where session_id=s.session_id;
 return public.login_xp_snapshot(s.session_id)||jsonb_build_object('awarded',true,'amount',v_amount,'creditedMinutes',v_count);
end; $$;

-- Recria a assinatura para ser compatível também com a primeira versão (retorno text).
drop function if exists public.start_login_xp_session(text);
create function public.start_login_xp_session(p_student_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_config jsonb; v_now timestamptz; v_end timestamptz; v_last timestamptz; v_points integer;
begin
 select points into v_points from public.students where id=p_student_id for update;
 if not found then return jsonb_build_object('version',2,'reason','student_not_found','serverNow',clock_timestamp()); end if;
 v_now:=clock_timestamp();
 select session_id into v_id from public.login_xp_sessions where student_id=p_student_id and closed_at is null and active_until>v_now order by started_at desc limit 1;
 if found then return public.login_xp_snapshot(v_id)||jsonb_build_object('reason','resumed'); end if;
 -- Liquida minutos válidos da sessão anterior antes de abrir uma nova janela.
 for v_id in select session_id from public.login_xp_sessions where student_id=p_student_id and closed_at is null order by started_at loop
   perform public.claim_login_xp(v_id);
 end loop;
 v_config:=public.login_xp_config(); v_now:=clock_timestamp();
 v_end:=((v_now at time zone 'America/Fortaleza')::date+(v_config->>'endTime')::time) at time zone 'America/Fortaleza';
 if (v_now at time zone 'America/Fortaleza')::time<(v_config->>'startTime')::time or v_now>=v_end then
   return jsonb_build_object('version',2,'reason','outside_schedule','serverNow',v_now);
 end if;
 if v_end-v_now<interval '1 minute' then return jsonb_build_object('version',2,'reason','insufficient_time','serverNow',v_now); end if;
 select last_credited_until into v_last from public.login_xp_credit_limits where student_id=p_student_id;
 insert into public.login_xp_sessions(student_id,started_at,last_confirmed_at,next_award_at,active_until,xp_per_minute)
 values(p_student_id,v_now,v_now,greatest(v_now,coalesce(v_last,v_now))+interval '1 minute',
 least(v_now+make_interval(mins=>(v_config->>'confirmationMinutes')::integer),v_end),(v_config->>'xpPerMinute')::integer)
 returning session_id into v_id;
 return public.login_xp_snapshot(v_id);
end; $$;

-- Compatibilidade: esta RPC não pode mais estender indefinidamente uma sessão.
drop function if exists public.confirm_login_xp_activity(uuid);
create function public.confirm_login_xp_activity(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_state jsonb;
begin
 v_state:=public.login_xp_snapshot(p_session_id);
 return v_state||jsonb_build_object('allowed',coalesce((v_state->>'locked')::boolean,false),
 'reason',case when coalesce((v_state->>'locked')::boolean,false) then null else 'confirmation_required' end);
end; $$;

revoke all on function public.start_login_xp_session(text),public.get_login_xp_session_status(text),public.claim_login_xp(uuid),public.confirm_login_xp_activity(uuid) from public;
grant execute on function public.start_login_xp_session(text),public.get_login_xp_session_status(text),public.claim_login_xp(uuid),public.confirm_login_xp_activity(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
