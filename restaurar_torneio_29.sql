-- SQL para restaurar os snapshots do Torneio 29 (Torneio Master)
-- Rode isso no Editor SQL do Supabase

WITH potencias_snapshots AS (
    -- Pega o snapshot mais recente de cada participante do torneio 29 que está sem torneio vinculado
    SELECT DISTINCT ON (user_id) 
        id, 
        user_id
    FROM public.tournament_deck_snapshots
    WHERE tournament_id IS NULL
      AND user_id IN (SELECT user_id FROM public.tournament_participants WHERE tournament_id = 29)
      AND created_at >= '2026-01-23'
    ORDER BY user_id, created_at DESC
)
UPDATE public.tournament_deck_snapshots
SET tournament_id = 29
WHERE id IN (SELECT id FROM potencias_snapshots);

-- Verifica quantos foram atualizados
SELECT count(*) as total_restaurado FROM public.tournament_deck_snapshots WHERE tournament_id = 29;
