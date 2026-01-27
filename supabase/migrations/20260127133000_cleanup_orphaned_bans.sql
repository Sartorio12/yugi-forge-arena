-- Remove orphaned banned cards (bans from users who are no longer in the tournament)
DELETE FROM public.tournament_banned_cards tbc
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.tournament_participants tp 
    WHERE tp.tournament_id = tbc.tournament_id 
    AND tp.user_id = tbc.user_id
);
