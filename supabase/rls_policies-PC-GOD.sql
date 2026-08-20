-- Políticas de acesso para o modo atual do aplicativo.
-- Execute este arquivo no Supabase Dashboard > SQL Editor do projeto correto.
--
-- IMPORTANTE: o aplicativo usa a chave pública (anon) diretamente no navegador
-- e não autentica usuários em auth.users. Assim, o papel `anon` precisa destas
-- permissões para os cadastros funcionarem. Isso é adequado somente para um
-- projeto de uso controlado. Antes de disponibilizar publicamente, migre os
-- logins para Supabase Auth e substitua estas políticas por regras baseadas em
-- auth.uid().

grant usage on schema public to anon;
grant select, insert, update, delete on table public.teachers to anon;
grant select, insert, update, delete on table public.students to anon;
grant select, insert, update, delete on table public.classes to anon;
grant select, insert, update, delete on table public.point_transactions to anon;

alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.classes enable row level security;
alter table public.point_transactions enable row level security;

drop policy if exists "app_teachers_access" on public.teachers;
create policy "app_teachers_access" on public.teachers
  for all to anon using (true) with check (true);

drop policy if exists "app_students_access" on public.students;
create policy "app_students_access" on public.students
  for all to anon using (true) with check (true);

drop policy if exists "app_classes_access" on public.classes;
create policy "app_classes_access" on public.classes
  for all to anon using (true) with check (true);

drop policy if exists "app_point_transactions_access" on public.point_transactions;
create policy "app_point_transactions_access" on public.point_transactions
  for all to anon using (true) with check (true);
