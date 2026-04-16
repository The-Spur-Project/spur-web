-- Sender can enable +1 invites on a spur
alter table public.spurs
  add column plus_one_enabled boolean not null default false;

-- Track who added a +1 and when they actually joined
alter table public.spur_recipients
  add column invited_by_id uuid references public.users(id),
  add column joined_at timestamptz not null default now();

-- System messages (e.g. "Joel added Sam to the chat") vs regular chat messages
alter table public.spur_messages
  add column type text not null default 'text'
    check (type in ('text', 'system'));

-- Allow a YES'd original recipient to insert new +1 recipients.
-- This is a second INSERT policy on spur_recipients — Postgres OR's multiple
-- INSERT policies, so the existing sender-only policy is untouched.
create policy "spur_recipients_plus_one_insert"
on public.spur_recipients for insert to authenticated
with check (
  -- spur must have plus_one_enabled = true
  exists (
    select 1 from public.spurs
    where id = spur_id and plus_one_enabled = true
  )
  -- the current user must be a YES'd *original* recipient (invited_by_id is null)
  and exists (
    select 1 from public.spur_recipients existing
    where existing.spur_id = spur_recipients.spur_id
      and existing.recipient_id = (select id from public.users where auth_uid = auth.uid())
      and existing.status = 'yes'
      and existing.invited_by_id is null
  )
  -- they haven't already used both +1 slots
  and (
    select count(*) from public.spur_recipients used
    where used.spur_id = spur_recipients.spur_id
      and used.invited_by_id = (select id from public.users where auth_uid = auth.uid())
  ) < 2
);
