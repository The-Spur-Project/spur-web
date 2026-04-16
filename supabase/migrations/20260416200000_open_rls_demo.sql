-- Drop restrictive insert policy and replace with open one for demo
drop policy if exists "users_insert" on public.users;
create policy "users_insert" on public.users
  for insert with check (true);

drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users
  for update using (true) with check (true);
