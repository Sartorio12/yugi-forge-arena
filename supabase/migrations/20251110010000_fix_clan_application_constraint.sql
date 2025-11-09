-- 1. Drop the old constraint
ALTER TABLE public.clan_applications
DROP CONSTRAINT IF EXISTS user_clan_application_unique;

-- 2. Add a more specific unique index for pending applications
CREATE UNIQUE INDEX user_clan_pending_application_unique
ON public.clan_applications (user_id, clan_id)
WHERE (status = 'PENDING');
