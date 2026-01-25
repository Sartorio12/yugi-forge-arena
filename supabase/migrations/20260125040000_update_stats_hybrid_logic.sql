-- Atualiza a função de estatísticas para suportar decks híbridos
-- A lógica agora combina arquétipos que possuam pelo menos 5 cartas no deck.

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
    -- 1. Conta o total de decks (snapshots) no torneio
    SELECT COUNT(*) INTO v_total_decks
    FROM public.tournament_deck_snapshots
    WHERE tournament_id = p_tournament_id;

    IF v_total_decks = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH deck_archetype_counts AS (
        -- Conta as cartas de cada arquétipo por deck
        SELECT 
            tsc.snapshot_id,
            c.archetype,
            COUNT(*) as card_count
        FROM public.tournament_deck_snapshot_cards tsc
        JOIN public.cards c ON tsc.card_api_id = c.id
        WHERE tsc.snapshot_id IN (SELECT id FROM public.tournament_deck_snapshots WHERE tournament_id = p_tournament_id)
          AND c.archetype IS NOT NULL
        GROUP BY tsc.snapshot_id, c.archetype
        HAVING COUNT(*) >= 5 -- Filtro para considerar apenas engines reais (min 5 cartas)
    ),
    deck_combined_names AS (
        -- Combina os nomes dos arquétipos encontrados em ordem alfabética
        -- Ex: "Branded / Despia" ou "Mitsurugi / Yummy"
        SELECT 
            snapshot_id,
            string_agg(archetype, ' / ' ORDER BY archetype ASC) as combined_archetype
        FROM deck_archetype_counts
        GROUP BY snapshot_id
    )
    SELECT 
        COALESCE(dcn.combined_archetype, 'Outros / Desconhecido') as archetype_name,
        COUNT(*) as deck_count,
        ROUND((COUNT(*)::numeric / v_total_decks) * 100, 2) as percentage
    FROM public.tournament_deck_snapshots ts
    LEFT JOIN deck_combined_names dcn ON ts.id = dcn.snapshot_id
    WHERE ts.tournament_id = p_tournament_id
    GROUP BY dcn.combined_archetype
    ORDER BY deck_count DESC;
END;
$$;

-- Garante permissões
GRANT EXECUTE ON FUNCTION public.get_tournament_archetype_stats(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tournament_archetype_stats(bigint) TO anon;
