import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugDeck231() {
  console.log("Checking Deck 231 contents...");

  // 1. Fetch deck basic info
  const { data: deck, error: dError } = await supabase
    .from('decks')
    .select('deck_name')
    .eq('id', 231)
    .single();

  if (dError) {
    console.error("Error fetching deck:", dError);
    return;
  }
  console.log(`Deck Name: ${deck.deck_name}`);

  // 2. Fetch cards in the deck
  const { data: cards, error: cError } = await supabase
    .from('deck_cards')
    .select(`
      card_id,
      cards (
        id,
        name,
        pt_name
      )
    `)
    .eq('deck_id', 231);

  if (cError) {
    console.error("Error fetching cards:", cError);
    return;
  }

  console.log(`Found ${cards.length} cards in deck 231.`);
  
  // 3. Check for matches
  const terms = ["Mitsurugi", "Yummy"];
  
  terms.forEach(term => {
      console.log(`\nChecking for term: "${term}"...`);
      const matches = cards.filter(c => 
          (c.cards.name && c.cards.name.toLowerCase().includes(term.toLowerCase())) ||
          (c.cards.pt_name && c.cards.pt_name.toLowerCase().includes(term.toLowerCase()))
      );
      
      if (matches.length > 0) {
          console.log(`✅ Found ${matches.length} matches for "${term}":`);
          matches.forEach(m => console.log(`   - ${m.cards.name} / ${m.cards.pt_name}`));
      } else {
          console.log(`❌ NO matches found for "${term}".`);
      }
  });
}

debugDeck231();
