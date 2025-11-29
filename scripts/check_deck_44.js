import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load .env file
const envPath = path.resolve(__dirname, '../.env');
let envConfig = {};

try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envConfig[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.error("Error reading .env file:", e);
}

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  console.log("Loaded config keys:", Object.keys(envConfig));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDeckCards() {
  const deckId = 44;

  console.log(`Checking cards for deck ID: ${deckId}...`);

  // 1. Check if deck exists
  const { data: deck, error: deckError } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .single();

  if (deckError) {
    console.error("Error fetching deck:", deckError);
    return;
  }
  
  if (!deck) {
      console.log("Deck not found.");
      return;
  }

  console.log(`Deck found: "${deck.deck_name}" (User: ${deck.user_id})`);

  // 2. Count cards in deck_cards
  const { count, error: countError } = await supabase
    .from('deck_cards')
    .select('*', { count: 'exact', head: true })
    .eq('deck_id', deckId);

  if (countError) {
    console.error("Error counting cards:", countError);
    return;
  }

  console.log(`Total cards found in 'deck_cards' for deck ${deckId}: ${count}`);
}

checkDeckCards();
