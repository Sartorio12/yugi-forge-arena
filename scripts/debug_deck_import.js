import { createClient } from '@supabase/supabase-js';

// Configuration (Hardcoded for testing)
const SUPABASE_URL = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugDeck(deckId) {
    console.log(`Analyzing Deck ID: ${deckId}`);

    // 1. Get Deck Info
    const { data: deck } = await supabase.from('decks').select('*').eq('id', deckId).single();
    if (!deck) {
        console.error("Deck not found!");
        return;
    }
    console.log(`Deck Name: ${deck.deck_name}`);

    // 2. Get Deck Cards
    const { data: deckCards } = await supabase.from('deck_cards').select('*').eq('deck_id', deckId);
    console.log(`Total rows in deck_cards: ${deckCards.length}`);

    if (deckCards.length === 0) return;

    // 3. Analyze a sample card
    const sample = deckCards[0];
    console.log(`Sample deck_card entry:`, sample);
    
    // 4. Try to find this card in 'cards' table
    const { data: card } = await supabase.from('cards').select('id, name').eq('id', sample.card_api_id).maybeSingle();
    
    if (card) {
        console.log(`SUCCESS: Card found in DB! Name: ${card.name}`);
    } else {
        console.error(`FAILURE: Card ID ${sample.card_api_id} NOT found in 'cards' table.`);
        
        // Try to find what this ID might be (if it was a name saved as ID?)
        // In our script, we map name -> ID. If map failed, maybe it inserted undefined or null? 
        // But the column is likely NOT NULL.
    }
    
    // Check for "undefined" or bad IDs
    const badIds = deckCards.filter(c => !c.card_api_id || c.card_api_id === 'undefined');
    if (badIds.length > 0) {
        console.error(`Found ${badIds.length} rows with invalid IDs (undefined/null).`);
    }
}

// Replace 267 with the ID of a broken deck you saw
debugDeck(267);
