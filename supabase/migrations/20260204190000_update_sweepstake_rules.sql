-- Update the setup RPC to accept a Rules text parameter
DROP FUNCTION IF EXISTS setup_duelist_league_sweepstake(text, text, timestamp with time zone, bigint, bigint, bigint, bigint);

CREATE OR REPLACE FUNCTION setup_duelist_league_sweepstake(
    p_title text,
    p_description text,
    p_deadline timestamp with time zone,
    p_d1_tournament_id bigint,
    p_d2_tournament_id bigint,
    p_d3_tournament_id bigint,
    p_d4_tournament_id bigint,
    p_rules text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sweepstake_id bigint;
    v_rules_json jsonb;
BEGIN
    -- If rules provided, create JSON structure, else empty object
    IF p_rules IS NOT NULL THEN
        v_rules_json := jsonb_build_object('content', p_rules);
    ELSE
        v_rules_json := '{}'::jsonb;
    END IF;

    -- 1. Create the Sweepstake
    INSERT INTO public.sweepstakes (title, description, start_date, end_date, entry_fee, rules)
    VALUES (p_title, p_description, now(), p_deadline, 5.00, v_rules_json)
    RETURNING id INTO v_sweepstake_id;

    -- 2. Create the 4 Divisions
    INSERT INTO public.sweepstake_divisions (sweepstake_id, tournament_id, division_name, points_reward)
    VALUES 
        (v_sweepstake_id, p_d1_tournament_id, 'Divisão 1', 10),
        (v_sweepstake_id, p_d2_tournament_id, 'Divisão 2', 15),
        (v_sweepstake_id, p_d3_tournament_id, 'Divisão 3', 20),
        (v_sweepstake_id, p_d4_tournament_id, 'Divisão 4', 25);

    RETURN v_sweepstake_id;
END;
$$;
