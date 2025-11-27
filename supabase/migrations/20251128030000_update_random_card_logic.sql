-- Update the get_random_card function to be deterministic for a given day
-- and to exclude "Skill Card" type.
CREATE OR REPLACE FUNCTION get_random_card()
RETURNS "public"."cards" AS $$
DECLARE
    rec "public"."cards";
    total_cards INT;
    -- Use the day of the year (1-366) to deterministically pick a card
    day_of_year INT := to_char(current_date, 'DDD')::INT;
    chosen_offset INT;
BEGIN
    -- Get the count of all valid cards
    SELECT count(*) INTO total_cards FROM public.cards WHERE type <> 'Skill Card';

    -- If there are no valid cards, return null or handle as needed
    IF total_cards = 0 THEN
        RETURN NULL;
    END IF;

    -- Use modulo to ensure the offset is always within the bounds of the table count
    chosen_offset := (day_of_year - 1) % total_cards;

    -- Select the card at the deterministic offset from a consistent ordering
    SELECT * INTO rec 
    FROM public.cards 
    WHERE type <> 'Skill Card' 
    ORDER BY id 
    OFFSET chosen_offset 
    LIMIT 1;

    RETURN rec;
END;
$$ LANGUAGE plpgsql;
