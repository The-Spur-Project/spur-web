-- Sync columns added directly in Supabase dashboard
alter table public.friendships add column if not exists requester_id uuid references public.users(id) on delete cascade;
alter table public.friendships add column if not exists addressee_id uuid references public.users(id) on delete cascade;
