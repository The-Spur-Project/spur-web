-- Enable RLS
alter table public.users enable row level security;
alter table public.friendships enable row level security;
alter table public.spurs enable row level security;
alter table public.spur_recipients enable row level security;
alter table public.spur_messages enable row level security;

-- users: authenticated can read all; owner can update/insert own row
create policy "users_read" on public.users for select to authenticated using (true);
create policy "users_update_own" on public.users for update to authenticated using (auth.uid() = auth_uid);
create policy "users_insert_own" on public.users for insert to authenticated with check (auth.uid() = auth_uid);

-- friendships: only involved parties can see
create policy "friendships_read" on public.friendships for select to authenticated
  using (
    user_id = (select id from public.users where auth_uid = auth.uid()) or
    friend_id = (select id from public.users where auth_uid = auth.uid())
  );
create policy "friendships_insert" on public.friendships for insert to authenticated
  with check (user_id = (select id from public.users where auth_uid = auth.uid()));
create policy "friendships_update" on public.friendships for update to authenticated
  using (
    user_id = (select id from public.users where auth_uid = auth.uid()) or
    friend_id = (select id from public.users where auth_uid = auth.uid())
  );
create policy "friendships_delete" on public.friendships for delete to authenticated
  using (
    user_id = (select id from public.users where auth_uid = auth.uid()) or
    friend_id = (select id from public.users where auth_uid = auth.uid())
  );

-- spurs: sender can CRUD; recipients can read
create policy "spurs_sender" on public.spurs for all to authenticated
  using (sender_id = (select id from public.users where auth_uid = auth.uid()));
create policy "spurs_recipient_read" on public.spurs for select to authenticated
  using (
    exists (
      select 1 from public.spur_recipients sr
      join public.users u on u.id = sr.recipient_id
      where sr.spur_id = spurs.id and u.auth_uid = auth.uid()
    )
  );

-- spur_recipients: sender or recipient can read; sender can insert; recipient can update own status
create policy "spur_recipients_read" on public.spur_recipients for select to authenticated
  using (
    recipient_id = (select id from public.users where auth_uid = auth.uid()) or
    exists (select 1 from public.spurs s join public.users u on u.id = s.sender_id
            where s.id = spur_id and u.auth_uid = auth.uid())
  );
create policy "spur_recipients_insert" on public.spur_recipients for insert to authenticated
  with check (
    exists (select 1 from public.spurs s join public.users u on u.id = s.sender_id
            where s.id = spur_id and u.auth_uid = auth.uid())
  );
create policy "spur_recipients_update_own" on public.spur_recipients for update to authenticated
  using (recipient_id = (select id from public.users where auth_uid = auth.uid()));

-- spur_messages: sender or recipient can read/insert
create policy "spur_messages_read" on public.spur_messages for select to authenticated
  using (
    sender_id = (select id from public.users where auth_uid = auth.uid()) or
    exists (
      select 1 from public.spur_recipients sr
      join public.users u on u.id = sr.recipient_id
      where sr.spur_id = spur_messages.spur_id and u.auth_uid = auth.uid()
    ) or
    exists (
      select 1 from public.spurs s join public.users u on u.id = s.sender_id
      where s.id = spur_messages.spur_id and u.auth_uid = auth.uid()
    )
  );
create policy "spur_messages_insert" on public.spur_messages for insert to authenticated
  with check (
    sender_id = (select id from public.users where auth_uid = auth.uid()) and (
      exists (select 1 from public.spur_recipients sr join public.users u on u.id = sr.recipient_id
              where sr.spur_id = spur_id and u.auth_uid = auth.uid()) or
      exists (select 1 from public.spurs s join public.users u on u.id = s.sender_id
              where s.id = spur_id and u.auth_uid = auth.uid())
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.spur_recipients;
alter publication supabase_realtime add table public.spur_messages;
