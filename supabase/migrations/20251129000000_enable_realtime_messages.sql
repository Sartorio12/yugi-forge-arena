begin;

drop publication if exists supabase_realtime;
create publication supabase_realtime;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.profiles;

commit;
