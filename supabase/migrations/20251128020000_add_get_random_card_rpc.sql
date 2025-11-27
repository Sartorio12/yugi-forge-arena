CREATE OR REPLACE FUNCTION get_random_card()
RETURNS "public"."cards" AS $$
DECLARE
    rec "public"."cards";
    total_cards INT;
    random_offset INT;
BEGIN
    SELECT count(*) INTO total_cards FROM public.cards;
    random_offset := floor(random() * total_cards);
    SELECT * INTO rec FROM public.cards OFFSET random_offset LIMIT 1;
    RETURN rec;
END;
$$ LANGUAGE plpgsql;
