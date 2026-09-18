-- Sistema de recompensas e ciclos persistentes.
-- Execute uma vez no Supabase SQL Editor.
-- Os registros encerrados/inativos permanecem para preservar o historico.
-- IMPORTANTE: o projeto atual autentica no navegador e usa a chave anon.
-- Portanto, estas politicas mantem compatibilidade com a arquitetura atual,
-- mas nao substituem Supabase Auth para autorizacao forte por professor.

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  category text not null default '',
  image_url text,
  start_date date not null,
  end_date date not null,
  quantity integer,
  eligibility_rules text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  cycle_type text not null default 'monthly' check (cycle_type in ('monthly', 'special')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rewards_valid_period check (end_date >= start_date),
  constraint rewards_valid_quantity check (quantity is null or quantity >= 0)
);

create index if not exists rewards_period_idx on public.rewards (start_date, end_date);
create index if not exists rewards_status_idx on public.rewards (status);

alter table public.rewards add column if not exists image_url text;

create table if not exists public.reward_cycle_participants (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id) on delete restrict,
  student_id text not null references public.students(id) on delete restrict,
  ranking_position integer,
  result text,
  awarded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reward_id, student_id)
);

alter table public.rewards enable row level security;
alter table public.reward_cycle_participants enable row level security;

-- Leitura do calendario para alunos. O app atual nao possui auth.uid().
drop policy if exists "rewards_public_read" on public.rewards;
create policy "rewards_public_read" on public.rewards for select to anon, authenticated using (true);

-- Compatibilidade com o modelo atual de configuracoes do professor.
drop policy if exists "rewards_anon_write" on public.rewards;
create policy "rewards_anon_write" on public.rewards for all to anon using (true) with check (true);

drop policy if exists "reward_participants_anon_access" on public.reward_cycle_participants;
create policy "reward_participants_anon_access" on public.reward_cycle_participants for all to anon using (true) with check (true);

grant select, insert, update, delete on public.rewards to anon, authenticated;
grant select, insert, update, delete on public.reward_cycle_participants to anon, authenticated;
