import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDeckPrivacy(deckId) {
    // 1. Check Deck Privacy
    const { data: deck } = await supabase.from('decks').select('id, user_id, is_private').eq('id', deckId).single();
    console.log('Deck Info:', deck);

    // 2. Try to fetch deck_cards as an ANONYMOUS user (simulating public access)
    // We need a separate client with anon key for this test to be valid
    const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY1MTUsImV4cCI6MjA3Nzk0MjUxNX0.f_2YZ8JIPhAYfL7I0Uvjdqg9qeUjRj8NuVaHBt0mprQ";
    const supabaseAnon = createClient(SUPABASE_URL, ANON_KEY);

    const { data: cards, error } = await supabaseAnon
        .from('deck_cards')
        .select('*')
        .eq('deck_id', deckId);

    if (error) {
        console.error('Anon Fetch Error:', error);
    } else {
        console.log(`Anon Fetch Result: ${cards.length} cards found.`);
    }
}

checkDeckPrivacy(267);
