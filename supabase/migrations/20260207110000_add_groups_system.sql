-- Add group_name column to tournament_participants
ALTER TABLE public.tournament_participants
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- RPC to shuffle and assign groups to tournament participants
CREATE OR REPLACE FUNCTION public.shuffle_tournament_groups(
    p_tournament_id BIGINT,
    p_num_groups INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_participant_record RECORD;
    v_group_index INTEGER := 0;
    v_group_label TEXT;
BEGIN
    -- Reset current groups for this tournament
    UPDATE public.tournament_participants
    SET group_name = NULL
    WHERE tournament_id = p_tournament_id;

    -- Iterate through participants in random order
    FOR v_participant_record IN (
        SELECT id 
        FROM public.tournament_participants 
        WHERE tournament_id = p_tournament_id
        ORDER BY RANDOM()
    ) LOOP
        -- Calculate group label (Group A, Group B, Group C...)
        -- v_group_index % p_num_groups gives 0, 1, 2...
        v_group_label := 'Grupo ' || CHR(65 + (v_group_index % p_num_groups));
        
        UPDATE public.tournament_participants
        SET group_name = v_group_label
        WHERE id = v_participant_record.id;
        
        v_group_index := v_group_index + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to clear groups for a tournament
CREATE OR REPLACE FUNCTION public.reset_tournament_groups(
    p_tournament_id BIGINT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.tournament_participants
    SET group_name = NULL
    WHERE tournament_id = p_tournament_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
