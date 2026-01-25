-- Refina a lógica de estatísticas para ser menos "suja" e mais precisa.
-- 1. Prioriza o arquétipo com mais cartas.
-- 2. Só cria nome híbrido se o segundo arquétipo for relevante.
-- 3. Se falhar em identificar pelas cartas, tenta usar o nome que o jogador deu ao deck.

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
    SELECT COUNT(*) INTO v_total_decks
    FROM public.tournament_deck_snapshots
    WHERE tournament_id = p_tournament_id;

    IF v_total_decks = 0 THEN
        RETURN;
  END IF;

    RETURN QUERY
    WITH deck_card_counts AS (
        -- Conta cartas por arquétipo em cada deck
        SELECT 
            tsc.snapshot_id,
            c.archetype,
            COUNT(*) as card_count
        FROM public.tournament_deck_snapshot_cards tsc
        JOIN public.cards c ON tsc.card_api_id = c.id
        WHERE tsc.snapshot_id IN (SELECT id FROM public.tournament_deck_snapshots WHERE tournament_id = p_tournament_id)
          AND c.archetype IS NOT NULL
        GROUP BY tsc.snapshot_id, c.archetype
    ),
    deck_ranking AS (
        -- Ranqueia os arquétipos dentro de cada deck
        SELECT 
            snapshot_id,
            archetype,
            card_count,
            ROW_NUMBER() OVER(PARTITION BY snapshot_id ORDER BY card_count DESC) as rank,
            FIRST_VALUE(card_count) OVER(PARTITION BY snapshot_id ORDER BY card_count DESC) as max_count
        FROM deck_card_counts
    ),
    identified_by_cards AS (
        -- Define o nome baseado nos 2 maiores arquétipos (se o 2º for >= 40% do 1º)
        SELECT 
            snapshot_id,
            CASE 
                WHEN COUNT(*) > 1 AND MAX(CASE WHEN rank = 2 THEN card_count END) >= (MAX(max_count) * 0.4)
                THEN STRING_AGG(archetype, ' / ' ORDER BY archetype ASC)
                ELSE MAX(CASE WHEN rank = 1 THEN archetype END)
            END as final_arch
        FROM deck_ranking
        WHERE rank <= 2
        GROUP BY snapshot_id
    )
    SELECT 
        COALESCE(
            ibc.final_arch, 
            -- Fallback: Se não identificou por cartas, usa o nome do deck (limpando espaços)
            TRIM(ts.deck_name),
            'Outros'
        ) as archetype_name,
        COUNT(*) as deck_count,
        ROUND((COUNT(*)::numeric / v_total_decks) * 100, 2) as percentage
    FROM public.tournament_deck_snapshots ts
    LEFT JOIN identified_by_cards ibc ON ts.id = ibc.snapshot_id
    WHERE ts.tournament_id = p_tournament_id
    GROUP BY 1
    ORDER BY deck_count DESC;
END;
$$;
