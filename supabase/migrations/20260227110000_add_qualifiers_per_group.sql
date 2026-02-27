
-- Add 'qualifiers_per_group' to tournaments table
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS qualifiers_per_group INTEGER DEFAULT 2;

-- Update the function to use the new column
CREATE OR REPLACE FUNCTION public.get_group_qualifiers(p_tournament_id BIGINT)
RETURNS TABLE (
    group_name TEXT,
    user_id UUID,
    pos INT
) AS $$
DECLARE
    v_qualifiers_per_group INT;
BEGIN
    -- Get the number of qualifiers for the specific tournament
    SELECT qualifiers_per_group
    INTO v_qualifiers_per_group
    FROM public.tournaments
    WHERE id = p_tournament_id;

    -- Fallback to 2 if not set
    IF v_qualifiers_per_group IS NULL THEN
        v_qualifiers_per_group := 2;
    END IF;

    RETURN QUERY
    WITH ranked_participants AS (
        SELECT 
            gs.group_name,
            gs.user_id,
            ROW_NUMBER() OVER (
                PARTITION BY gs.group_name 
                ORDER BY 
                    gs.is_disqualified ASC,
                    gs.points DESC,
                    gs.game_difference DESC,
                    gs.wins DESC,
                    gs.matches_played ASC
            ) as ranking_pos
        FROM public.get_tournament_group_standings(p_tournament_id) gs
    )
    SELECT 
        rp.group_name,
        rp.user_id,
        rp.ranking_pos::INT
    FROM ranked_participants rp
    WHERE rp.ranking_pos <= v_qualifiers_per_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update tournament 44 to have 3 qualifiers per group
UPDATE public.tournaments
SET qualifiers_per_group = 3
WHERE id = 44;
