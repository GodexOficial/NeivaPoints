-- Execute este arquivo no Supabase Dashboard > SQL Editor.
-- Os atalhos são compartilhados entre o painel do professor e os alunos.
create table if not exists public.external_apps (
  id text primary key,
  name text not null,
  url text not null check (url like 'https://%'),
  cover_url text,
  -- As posições 0 a 2 da interface são reservadas para Word, Excel e PowerPoint.
  position integer not null check (position between 0 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on table public.external_apps to anon;
alter table public.external_apps enable row level security;

drop policy if exists "external_apps_access" on public.external_apps;
create policy "external_apps_access" on public.external_apps
  for all to anon using (true) with check (true);
