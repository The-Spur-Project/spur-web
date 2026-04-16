create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid unique references auth.users(id) on delete cascade,
  name text not null,
  phone text unique not null,
  created_at timestamptz default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  friend_id uuid references public.users(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

create table if not exists public.spurs (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade,
  message text,
  archived boolean default false,
  sender_unread_count int default 0,
  last_message text,
  created_at timestamptz default now()
);

create table if not exists public.spur_recipients (
  id uuid primary key default gen_random_uuid(),
  spur_id uuid references public.spurs(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade,
  status text check (status in ('pending', 'seen', 'yes', 'no', 'left')) default 'pending',
  archived boolean default false,
  unread_count int default 0,
  created_at timestamptz default now(),
  unique(spur_id, recipient_id)
);

create table if not exists public.spur_messages (
  id uuid primary key default gen_random_uuid(),
  spur_id uuid references public.spurs(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

do $$ begin
  alter publication supabase_realtime add table public.spur_recipients;
exception when others then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.spur_messages;
exception when others then null;
end $$;

alter table public.users enable row level security;
alter table public.friendships enable row level security;
alter table public.spurs enable row level security;
alter table public.spur_recipients enable row level security;
alter table public.spur_messages enable row level security;

do $$ begin
  create policy "users_select" on public.users for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users_insert" on public.users for insert with check (auth.uid() = auth_uid);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "users_update" on public.users for update using (auth.uid() = auth_uid);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "spurs_all" on public.spurs for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "spur_recipients_all" on public.spur_recipients for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "spur_messages_all" on public.spur_messages for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "friendships_all" on public.friendships for all using (true) with check (true);
exception when duplicate_object then null; end $$;
