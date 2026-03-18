-- Per-user archiving for recipients
alter table public.spur_recipients
  add column archived boolean not null default false;

-- Sender-side archiving on the spur itself
alter table public.spurs
  add column archived boolean not null default false;

-- Allow 'left' as a recipient status (for leaving a chat)
alter table public.spur_recipients
  drop constraint spur_recipients_status_check;

alter table public.spur_recipients
  add constraint spur_recipients_status_check
  check (status in ('pending', 'seen', 'yes', 'no', 'left'));
