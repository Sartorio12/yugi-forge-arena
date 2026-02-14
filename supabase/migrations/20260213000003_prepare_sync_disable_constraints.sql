-- Disable Foreign Keys and Triggers to allow bulk data import/sync
-- Run this BEFORE importing data from Cloud to Local

-- 1. Switch to 'replica' mode (disables FK checks and most triggers for the current session)
SET session_replication_role = 'replica';

-- 2. Clear existing data to avoid conflicts (optional, but recommended for full sync)
-- Uncomment these if you want to wipe the local tables before importing
-- TRUNCATE TABLE public.tournament_matches CASCADE;
-- TRUNCATE TABLE public.profiles CASCADE;
-- TRUNCATE TABLE public.clans CASCADE;
-- TRUNCATE TABLE public.clan_members CASCADE;
-- TRUNCATE TABLE public.tournaments CASCADE;

-- 3. (After running the import tool in DBeaver, run the next block)

-- ----------------------------------------------------------------
-- RUN THIS BLOCK AFTER IMPORT IS COMPLETE
-- ----------------------------------------------------------------

-- 4. Switch back to 'origin' mode (re-enables FK checks and triggers)
-- SET session_replication_role = 'origin';

-- 5. Refresh view permissions just in case
GRANT SELECT ON public.player_rankings_view TO anon, authenticated;
