-- Security definer functions to break circular RLS dependency between spurs and spur_recipients.
-- Without this, querying spurs triggers spur_recipients policy which queries spurs → infinite loop → 500.

create or replace function public.is_spur_recipient(p_spur_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.spur_recipients sr
    join public.users u on u.id = sr.recipient_id
    where sr.spur_id = p_spur_id and u.auth_uid = auth.uid()
  )
$$;

create or replace function public.is_spur_sender(p_spur_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.spurs s
    join public.users u on u.id = s.sender_id
    where s.id = p_spur_id and u.auth_uid = auth.uid()
  )
$$;

-- Drop the circular policies
drop policy if exists "spurs_recipient_read" on public.spurs;
drop policy if exists "spur_recipients_read" on public.spur_recipients;

-- Recreate using security definer functions (no more cross-table RLS loops)
create policy "spurs_recipient_read" on public.spurs for select to authenticated
  using (public.is_spur_recipient(id));

create policy "spur_recipients_read" on public.spur_recipients for select to authenticated
  using (
    recipient_id = (select id from public.users where auth_uid = auth.uid()) or
    public.is_spur_sender(spur_id)
  );
