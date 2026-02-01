-- RPC to bulk insert matches from Challonge or other sources
CREATE OR REPLACE FUNCTION bulk_insert_matches(p_tournament_id bigint, p_matches jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    m jsonb;
BEGIN
    FOR m IN SELECT * FROM jsonb_array_elements(p_matches)
    LOOP
        -- Only insert if we have both players (valid UUIDs)
        IF (m->>'player1_id') IS NOT NULL AND (m->>'player2_id') IS NOT NULL THEN
            INSERT INTO public.tournament_matches (
                tournament_id,
                player1_id,
                player2_id,
                winner_id,
                round_name,
                created_at
            ) VALUES (
                p_tournament_id,
                (m->>'player1_id')::uuid,
                (m->>'player2_id')::uuid,
                (m->>'winner_id')::uuid,
                m->>'round_name',
                COALESCE((m->>'completed_at')::timestamp with time zone, now())
            );
        END IF;
    END LOOP;
END;
$$;
