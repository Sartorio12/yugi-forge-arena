-- Drop the old function with the previous signature
DROP FUNCTION IF EXISTS public.update_player_wins(p_participant_id integer, p_new_wins integer);

-- Recreate the function to handle an atomic change, preventing race conditions
CREATE OR REPLACE FUNCTION update_player_wins(p_participant_id INT, p_win_change INT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    new_wins INT;
    xp_gained INT;
BEGIN
    -- Atomically update wins and get the new value and user_id
    UPDATE public.tournament_participants
    SET total_wins_in_tournament = total_wins_in_tournament + p_win_change
    WHERE id = p_participant_id
    RETURNING user_id, total_wins_in_tournament INTO v_user_id, new_wins;

    -- Ensure wins don't go below zero
    IF new_wins < 0 THEN
        UPDATE public.tournament_participants
        SET total_wins_in_tournament = 0
        WHERE id = p_participant_id;
        -- We don't need to raise a notice for the frontend, but it's good practice
    END IF;

    -- Only add XP for positive changes
    IF p_win_change > 0 THEN
        xp_gained := p_win_change * 5;
        UPDATE public.profiles
        SET xp = xp + xp_gained
        WHERE id = v_user_id;

        -- Check for level up
        PERFORM check_level_up(v_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
