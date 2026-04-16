-- Add requester_id to track the original initiator of a friendship across both directional rows
alter table public.friendships add column if not exists requester_id uuid references public.users(id) on delete cascade;
