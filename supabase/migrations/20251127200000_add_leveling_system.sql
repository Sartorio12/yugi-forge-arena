-- Add level and xp columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN level INT NOT NULL DEFAULT 1,
ADD COLUMN xp INT NOT NULL DEFAULT 0;

-- Helper function to define the leveling curve
CREATE OR REPLACE FUNCTION get_xp_for_level(level INT)
RETURNS INT AS $$
BEGIN
    -- XP needed to get from (level-1) to level
    -- Example: To get to level 2, you need (2-1)*75 = 75 XP.
    -- To get to level 3, you need (3-1)*75 = 150 XP from level 2.
    RETURN (level - 1) * 75;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to handle level ups
CREATE OR REPLACE FUNCTION check_level_up(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_xp INT;
    current_level INT;
    xp_needed INT;
BEGIN
    SELECT xp, level INTO current_xp, current_level FROM public.profiles WHERE id = p_user_id;
    
    -- XP needed to reach the NEXT level
    xp_needed := get_xp_for_level(current_level + 1);

    WHILE current_xp >= xp_needed AND xp_needed > 0 LOOP
        current_level := current_level + 1;
        current_xp := current_xp - xp_needed;
        xp_needed := get_xp_for_level(current_level + 1);
    END LOOP;

    UPDATE public.profiles
    SET level = current_level, xp = current_xp
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function for admins/organizers to update wins and trigger XP/leveling
CREATE OR REPLACE FUNCTION update_player_wins(p_participant_id INT, p_new_wins INT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    old_wins INT;
    win_difference INT;
    xp_gained INT;
BEGIN
    -- Get participant details
    SELECT user_id, total_wins_in_tournament INTO v_user_id, old_wins
    FROM public.tournament_participants
    WHERE id = p_participant_id;

    -- Calculate difference
    win_difference := p_new_wins - old_wins;

    IF win_difference > 0 THEN
        -- Update wins in tournament_participants
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = p_new_wins
        WHERE id = p_participant_id;

        -- Calculate and add XP
        xp_gained := win_difference * 5;
        UPDATE public.profiles
        SET xp = xp + xp_gained
        WHERE id = v_user_id;

        -- Check for level up
        PERFORM check_level_up(v_user_id);
    ELSE
        -- Just update the wins if it's not a positive change (e.g., correcting a mistake)
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = p_new_wins
        WHERE id = p_participant_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Re-create the view to include new columns
DROP VIEW IF EXISTS public.player_rankings_view;
CREATE OR REPLACE VIEW public.player_rankings_view AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.level, -- Added level
    p.xp,    -- Added xp
    COALESCE(sum(tp.total_wins_in_tournament), 0) AS total_wins,
    (COALESCE(sum(tp.total_wins_in_tournament), 0) * 5) AS total_points
FROM
    public.profiles p
    LEFT JOIN public.tournament_participants tp ON p.id = tp.user_id
GROUP BY
    p.id, p.username, p.avatar_url, p.level, p.xp
ORDER BY
    total_points DESC;
