-- Re-define get_xp_for_level to return a fixed amount.
-- This function is no longer conceptually "XP for a specific level" but the "XP per level".
CREATE OR REPLACE FUNCTION get_xp_for_level(level INT)
RETURNS INT AS $$
BEGIN
  RETURN 50;
END;
$$ LANGUAGE plpgsql;

-- Remove the old handle_level_up function as its logic is completely replaced.
DROP FUNCTION IF EXISTS handle_level_up(p_user_id UUID);

-- Remove the old handle_delevel function as its logic is completely replaced.
DROP FUNCTION IF EXISTS handle_delevel(p_user_id UUID);

-- Create a new unified function to recalculate and set the level based on total XP.
-- This function replaces both handle_level_up and handle_delevel.
CREATE OR REPLACE FUNCTION recalculate_player_level(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  current_xp INT;
  new_level INT;
BEGIN
  -- Get the user's current total XP
  SELECT xp INTO current_xp FROM public.profiles WHERE id = p_user_id;

  -- Ensure XP is not negative
  IF current_xp < 0 THEN
    current_xp := 0;
  END IF;

  -- Calculate the new level based on cumulative XP
  new_level := floor(current_xp / 50) + 1;

  -- Update the profile with the new level and the (potentially floored) XP
  UPDATE public.profiles
  SET 
    level = new_level,
    xp = current_xp -- Ensure XP is set to 0 if it was negative
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Re-define the atomic_update_player_stats function to use the new unified recalculation function.
CREATE OR REPLACE FUNCTION atomic_update_player_stats(p_user_id UUID, p_win_change INT, p_loss_change INT)
RETURNS VOID AS $$
DECLARE
  xp_change INT;
BEGIN
  -- Ensure user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RETURN;
  END IF;

  -- Calculate XP change and update profile
  xp_change := p_win_change * 5;

  UPDATE public.profiles
  SET 
    wins = wins + p_win_change,
    losses = losses + p_loss_change,
    xp = xp + xp_change,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- After updating XP, always recalculate the level
  PERFORM recalculate_player_level(p_user_id);
END;
$$ LANGUAGE plpgsql;
