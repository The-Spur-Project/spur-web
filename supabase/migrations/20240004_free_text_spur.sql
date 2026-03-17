-- Replace rigid type+note with a free-text message field
alter table public.spurs add column message text;
alter table public.spurs alter column type drop not null;
alter table public.spurs drop constraint if exists spurs_type_check;
