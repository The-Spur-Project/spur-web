-- Fast ordered message lookups per spur
create index if not exists spur_messages_spur_created
  on public.spur_messages(spur_id, created_at);

-- Denormalized last-message preview (shown on SpurCard without an extra query)
alter table public.spurs
  add column last_message      text,
  add column last_message_at   timestamptz,
  add column sender_unread_count integer not null default 0;

-- Per-recipient unread message counter (shown as badge on SpurCard)
alter table public.spur_recipients
  add column unread_count integer not null default 0;

-- Trigger: on every new message
--   1. Update last_message on the spur
--   2. Increment sender_unread_count when a recipient sends
--   3. Increment unread_count for every recipient who didn't send and hasn't left
create or replace function public.on_spur_message_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.spurs
  set
    last_message        = new.content,
    last_message_at     = new.created_at,
    sender_unread_count = case
      when sender_id != new.sender_id then sender_unread_count + 1
      else sender_unread_count
    end
  where id = new.spur_id;

  update public.spur_recipients
  set unread_count = unread_count + 1
  where spur_id     = new.spur_id
    and recipient_id != new.sender_id
    and status       != 'left';

  return new;
end;
$$;

create trigger spur_messages_after_insert
  after insert on public.spur_messages
  for each row execute function public.on_spur_message_insert();

-- Add spurs to realtime so Home can hear last_message updates live
alter publication supabase_realtime add table public.spurs;
