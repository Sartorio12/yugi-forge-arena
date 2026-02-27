
-- Extend card search to include the description field
CREATE OR REPLACE FUNCTION public.search_cards_with_filters_and_popularity(
    p_search_query TEXT,
    p_selected_card_types TEXT[],
    p_selected_attributes TEXT[],
    p_selected_monster_races TEXT[],
    p_selected_spell_races TEXT[],
    p_selected_trap_races TEXT[],
    p_genesys_points_operator TEXT,
    p_genesys_points_value INT,
    p_sort_by TEXT,
    p_sort_ascending BOOLEAN,
    p_selected_levels INT[] DEFAULT NULL
)
RETURNS SETOF public.cards AS $$
BEGIN
    RETURN QUERY
    SELECT c.*
    FROM public.cards c
    LEFT JOIN public.card_popularity cp ON c.id = cp.card_api_id
    WHERE
        (p_search_query IS NULL OR c.name ILIKE '%' || p_search_query || '%' OR c.pt_name ILIKE '%' || p_search_query || '%' OR c.description ILIKE '%' || p_search_query || '%')
    AND
        (p_selected_card_types IS NULL OR c.type = ANY(p_selected_card_types))
    AND
        (p_selected_attributes IS NULL OR c.attribute = ANY(p_selected_attributes))
    AND
        (
            (p_selected_monster_races IS NULL AND p_selected_spell_races IS NULL AND p_selected_trap_races IS NULL)
            OR
            (p_selected_monster_races IS NOT NULL AND c.type LIKE '%Monster%' AND c.race = ANY(p_selected_monster_races))
            OR
            (p_selected_spell_races IS NOT NULL AND c.type = 'Spell Card' AND c.race = ANY(p_selected_spell_races))
            OR
            (p_selected_trap_races IS NOT NULL AND c.type = 'Trap Card' AND c.race = ANY(p_selected_trap_races))
        )
    AND
        (
            p_genesys_points_value IS NULL OR
            (p_genesys_points_operator = 'gte' AND c.genesys_points >= p_genesys_points_value) OR
            (p_genesys_points_operator = 'lte' AND c.genesys_points <= p_genesys_points_value) OR
            (p_genesys_points_operator = '=' AND c.genesys_points = p_genesys_points_value)
        )
    AND
        (p_selected_levels IS NULL OR c.level = ANY(p_selected_levels))
    ORDER BY
        CASE
            WHEN p_sort_by = 'popularity' THEN COALESCE(cp.popularity_score, 0)
            ELSE NULL
        END DESC,
        CASE
            WHEN p_sort_by = 'name' THEN c.name
            ELSE NULL
        END,
        CASE
            WHEN p_sort_by = 'atk' THEN c.atk
            ELSE NULL
        END,
        CASE
            WHEN p_sort_by = 'def' THEN c.def
            ELSE NULL
        END,
        CASE
            WHEN p_sort_by = 'level' THEN c.level
            ELSE NULL
        END,
        c.id -- Stable sort
    LIMIT 100;
END;
$$ LANGUAGE plpgsql;
