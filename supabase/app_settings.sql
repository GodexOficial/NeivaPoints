-- Configurações compartilhadas do sistema.
-- Execute no Supabase Dashboard > SQL Editor.
-- A tabela public.app_settings já deve existir com as colunas:
-- key (text, primary key), value (text), updated_at (timestamptz).

insert into public.app_settings (key, value)
values
  ('teacher_security_key', 'PROF2025'),
  ('student_security_key', 'ALUNO2026')
on conflict (key) do nothing;

grant select, insert, update on table public.app_settings to anon;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_read" on public.app_settings;
create policy "app_settings_read" on public.app_settings
  for select to anon using (true);

drop policy if exists "app_settings_insert" on public.app_settings;
create policy "app_settings_insert" on public.app_settings
  for insert to anon with check (true);

drop policy if exists "app_settings_update" on public.app_settings;
create policy "app_settings_update" on public.app_settings
  for update to anon using (true) with check (true);
