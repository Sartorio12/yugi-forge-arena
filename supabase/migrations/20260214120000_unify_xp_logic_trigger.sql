
-- 20260214120000_unify_xp_logic_trigger.sql
-- Centralizes XP updates on a single trigger on tournament_participants
-- and fixes current XP desync for all users.

-- 1. Create the trigger function to sync XP from tournament_participants
CREATE OR REPLACE FUNCTION public.sync_xp_from_wins()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    xp_change INT;
BEGIN
    -- Determine the user_id and calculate the change in XP (1 win = 5 XP)
    IF (TG_OP = 'UPDATE') THEN
        v_user_id := NEW.user_id;
        xp_change := (COALESCE(NEW.total_wins_in_tournament, 0) - COALESCE(OLD.total_wins_in_tournament, 0)) * 5;
    ELSIF (TG_OP = 'INSERT') THEN
        v_user_id := NEW.user_id;
        xp_change := COALESCE(NEW.total_wins_in_tournament, 0) * 5;
    ELSIF (TG_OP = 'DELETE') THEN
        v_user_id := OLD.user_id;
        xp_change := -COALESCE(OLD.total_wins_in_tournament, 0) * 5;
    END IF;

    -- If there's a change in XP, update the profile
    IF xp_change <> 0 THEN
        UPDATE public.profiles
        SET xp = GREATEST(0, xp + xp_change),
            updated_at = now()
        WHERE id = v_user_id;

        -- Recalculate level and award frames
        PERFORM public.recalculate_player_level(v_user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to tournament_participants
DROP TRIGGER IF EXISTS trg_sync_xp_from_wins ON public.tournament_participants;
CREATE TRIGGER trg_sync_xp_from_wins
AFTER INSERT OR UPDATE OF total_wins_in_tournament OR DELETE ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION public.sync_xp_from_wins();

-- 3. Simplify update_player_wins RPC (remove manual XP logic)
-- This function is used by the +/- buttons in the Admin UI.
-- Now it only needs to update the tournament wins, and the trigger will handle the rest.
CREATE OR REPLACE FUNCTION public.update_player_wins(p_participant_id INT, p_win_change INT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tournament_participants
    SET total_wins_in_tournament = GREATEST(0, total_wins_in_tournament + p_win_change)
    WHERE id = p_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean up any other functions that might be manually updating XP to avoid double counting
-- (Like the old atomic_update_player_stats if it's still being used for wins)
CREATE OR REPLACE FUNCTION public.atomic_update_player_stats(p_user_id UUID, p_win_change INT, p_loss_change INT)
RETURNS VOID AS $$
BEGIN
  -- This function now only handles manual profile updates if needed, 
  -- but we'll remove the XP logic from it as well to be safe, 
  -- since XP should follow tournament wins.
  -- If we ever need manual XP adjustments, we should use a different mechanism.
  
  -- UPDATE public.profiles
  -- SET 
  --   xp = xp + (p_win_change * 5),
  --   updated_at = NOW()
  -- WHERE id = p_user_id;

  -- PERFORM public.recalculate_player_level(p_user_id);
  
  -- For now, we'll just keep it empty or remove it if not used.
  -- Actually, let's just make it do nothing to avoid breaking callers but stop the desync.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. One-time Sync: Recalculate XP for everyone based on current wins
-- This ensures everyone is perfectly synced with their tournament performance.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        UPDATE public.profiles p
        SET xp = (
            SELECT COALESCE(SUM(total_wins_in_tournament), 0) * 5
            FROM public.tournament_participants tp
            WHERE tp.user_id = r.id
        )
        WHERE p.id = r.id;
        
        -- This will also fix the level and award any missing frames
        PERFORM public.recalculate_player_level(r.id);
    END LOOP;
END $$;
