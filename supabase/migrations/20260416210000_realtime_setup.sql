do $$ begin
  alter publication supabase_realtime add table public.spurs;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.spur_recipients;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.spur_messages;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when others then null; end $$;
