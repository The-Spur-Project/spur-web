-- Ensure friendships table has the columns our app expects
alter table public.friendships
  add column if not exists user_id uuid references public.users(id) on delete cascade;

alter table public.friendships
  add column if not exists friend_id uuid references public.users(id) on delete cascade;

alter table public.friendships
  add column if not exists status text default 'pending';

alter table public.friendships
  add column if not exists created_at timestamptz default now();

-- Drop conflicting constraints if they exist, then re-add
do $$ begin
  alter table public.friendships drop constraint if exists friendships_status_check;
exception when others then null; end $$;

alter table public.friendships
  add constraint friendships_status_check check (status in ('pending', 'accepted'));

-- Unique constraint so we can upsert cleanly
do $$ begin
  alter table public.friendships add constraint friendships_user_friend_unique unique (user_id, friend_id);
exception when duplicate_table then null;
when others then null; end $$;
