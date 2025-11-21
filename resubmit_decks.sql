-- SQL script to manually re-submit decks for tournament #6

-- Submission 1
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 35;
    v_user_id_to_submit UUID := 'ec846896-04fd-4de2-ac11-d227db4657b4';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 2
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 41;
    v_user_id_to_submit UUID := 'cbeb406b-8dc4-43ce-a865-dece8d766327';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 3
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 40;
    v_user_id_to_submit UUID := '1bc1b804-8651-48de-aa96-cb52daeffd0c';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 4
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 46;
    v_user_id_to_submit UUID := '1dd84fd2-a720-4713-965f-fb0c6f873245';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 5
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 47;
    v_user_id_to_submit UUID := '2659fc99-ad6f-40fa-aa40-5dcbeb7dab11';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 6
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 26;
    v_user_id_to_submit UUID := '7a86e434-39db-4f3c-a68b-104ffd2adf43';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 7
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 31;
    v_user_id_to_submit UUID := '6aa321d7-89fd-4333-9b05-ddac8fba4e73';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 8
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 42;
    v_user_id_to_submit UUID := 'b5d357e4-f8b2-4788-bf77-d6ec57bddc6d';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;

-- Submission 9
DO $$
DECLARE
    v_deck_id_to_submit BIGINT := 48;
    v_user_id_to_submit UUID := 'bcf4388f-7445-486c-8fb5-596af677d3e2';
    v_tournament_id_to_submit BIGINT := 6;
    v_deck_details RECORD;
    v_new_snapshot_id BIGINT;
BEGIN
    SELECT deck_name, is_private, is_genesys INTO v_deck_details FROM public.decks WHERE id = v_deck_id_to_submit AND user_id = v_user_id_to_submit;
    INSERT INTO public.tournament_deck_snapshots (tournament_id, user_id, deck_name, is_private, is_genesys) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_details.deck_name, v_deck_details.is_private, v_deck_details.is_genesys) RETURNING id INTO v_new_snapshot_id;
    INSERT INTO public.tournament_deck_snapshot_cards (snapshot_id, card_api_id, deck_section) SELECT v_new_snapshot_id, card_api_id, deck_section FROM public.deck_cards WHERE deck_id = v_deck_id_to_submit;
    INSERT INTO public.tournament_decks (tournament_id, user_id, deck_id, deck_snapshot_id) VALUES (v_tournament_id_to_submit, v_user_id_to_submit, v_deck_id_to_submit, v_new_snapshot_id) ON CONFLICT (tournament_id, user_id, deck_id) DO UPDATE SET deck_snapshot_id = v_new_snapshot_id;
END $$;
