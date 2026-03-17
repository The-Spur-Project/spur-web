create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_uid uuid unique references auth.users(id) on delete cascade,
  name text not null,
  phone text unique not null,
  created_at timestamptz default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  friend_id uuid references public.users(id) on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default now(),
  unique(user_id, friend_id)
);

create table public.spurs (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.users(id) on delete cascade,
  type text check (type in ('hangout', 'food', 'store_run', 'library')) not null,
  note text,
  created_at timestamptz default now()
);

create table public.spur_recipients (
  id uuid primary key default gen_random_uuid(),
  spur_id uuid references public.spurs(id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade,
  status text check (status in ('pending', 'seen', 'yes', 'no')) default 'pending',
  created_at timestamptz default now(),
  unique(spur_id, recipient_id)
);

create table public.spur_messages (
  id uuid primary key default gen_random_uuid(),
  spur_id uuid references public.spurs(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
