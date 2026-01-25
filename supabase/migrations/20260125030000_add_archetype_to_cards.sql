-- 1. Adiciona a coluna de arquétipo na tabela de cartas
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS archetype TEXT;

-- 2. Atualiza (ou cria) a função de estatísticas para usar o arquétipo oficial
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
    -- Conta o total de decks (snapshots) no torneio
    SELECT COUNT(*) INTO v_total_decks
    FROM public.tournament_deck_snapshots
    WHERE tournament_id = p_tournament_id;

    IF v_total_decks = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH deck_archetypes AS (
        -- Para cada carta no deck, pegamos o arquétipo dela
        SELECT 
            tsc.snapshot_id,
            c.archetype,
            COUNT(*) as card_count
        FROM public.tournament_deck_snapshot_cards tsc
        JOIN public.cards c ON tsc.card_api_id = c.id
        WHERE tsc.snapshot_id IN (SELECT id FROM public.tournament_deck_snapshots WHERE tournament_id = p_tournament_id)
          AND c.archetype IS NOT NULL -- Ignora cartas genéricas (staples)
        GROUP BY tsc.snapshot_id, c.archetype
    ),
    dominant_archetype_per_deck AS (
        -- Identifica qual arquétipo predomina em cada deck individual
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

-- Garante permissão de execução
GRANT EXECUTE ON FUNCTION public.get_tournament_archetype_stats(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_archetype_stats(bigint) TO anon;
