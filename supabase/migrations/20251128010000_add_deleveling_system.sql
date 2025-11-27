-- Function to handle level downs
CREATE OR REPLACE FUNCTION check_level_down(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    current_xp INT;
    current_level INT;
    xp_for_current_level INT;
BEGIN
    SELECT xp, level INTO current_xp, current_level FROM public.profiles WHERE id = p_user_id;

    WHILE current_xp < 0 AND current_level > 1 LOOP
        -- XP required to have reached the current level from the previous one
        xp_for_current_level := get_xp_for_level(current_level);
        
        current_level := current_level - 1;
        current_xp := current_xp + xp_for_current_level;
    END LOOP;

    -- Ensure XP doesn't go below 0 for level 1
    IF current_level = 1 AND current_xp < 0 THEN
        current_xp := 0;
    END IF;

    UPDATE public.profiles
    SET level = current_level, xp = current_xp
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update the main function to handle both positive and negative win changes
CREATE OR REPLACE FUNCTION update_player_wins(p_participant_id INT, p_win_change INT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    new_wins INT;
    xp_change INT;
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
    END IF;

    -- Calculate XP change and update profile
    xp_change := p_win_change * 5;
    UPDATE public.profiles
    SET xp = xp + xp_change
    WHERE id = v_user_id;

    -- Check for level up or down
    IF p_win_change > 0 THEN
        PERFORM check_level_up(v_user_id);
    ELSIF p_win_change < 0 THEN
        PERFORM check_level_down(v_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
