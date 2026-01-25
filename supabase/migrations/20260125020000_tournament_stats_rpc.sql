-- Função para calcular estatísticas de arquétipos de um torneio
CREATE OR REPLACE FUNCTION public.get_tournament_archetype_stats(p_tournament_id bigint)
RETURNS TABLE (
    archetype_name TEXT,
    deck_count BIGINT,
    percentage NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_decks BIGINT;
BEGIN
    -- 1. Conta o total de decks únicos (snapshots) no torneio
    SELECT COUNT(*) INTO v_total_decks
    FROM public.tournament_deck_snapshots
    WHERE tournament_id = p_tournament_id;

    IF v_total_decks = 0 THEN
        RETURN;
    END IF;

    -- 2. Tenta identificar o arquétipo de cada deck
    -- Estratégia: O arquétipo do deck é o arquétipo mais comum entre suas cartas (excluindo cartas sem arquétipo/staples)
    RETURN QUERY
    WITH deck_archetypes AS (
        SELECT 
            ts.id as snapshot_id,
            c.archetype,
            COUNT(*) as card_count
        FROM public.tournament_deck_snapshots ts
        JOIN public.tournament_deck_snapshot_cards tsc ON ts.id = tsc.snapshot_id
        JOIN public.cards c ON tsc.card_api_id = c.id
        WHERE ts.tournament_id = p_tournament_id
          AND c.archetype IS NOT NULL -- Ignora cartas sem arquétipo definido
        GROUP BY ts.id, c.archetype
    ),
    dominant_archetype_per_deck AS (
        -- Para cada deck, pega apenas o arquétipo que aparece mais vezes
        SELECT DISTINCT ON (snapshot_id)
            archetype
        FROM deck_archetypes
        ORDER BY snapshot_id, card_count DESC
    )
    SELECT 
        archetype as archetype_name,
        COUNT(*) as deck_count,
        ROUND((COUNT(*)::numeric / v_total_decks) * 100, 2) as percentage
    FROM dominant_archetype_per_deck
    GROUP BY archetype
    ORDER BY deck_count DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tournament_archetype_stats(bigint) TO authenticated;
