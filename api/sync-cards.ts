import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch'; // Added explicit import for fetch

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL; // Corrected: Removed VITE_ prefix
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for backend operations

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
  // This will prevent the function from being deployed or running correctly
  // if the environment variables are missing.
  // In a Vercel environment, this error would be caught during invocation.
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export default async function (request: VercelRequest, response: VercelResponse) {
  // For initial testing, allowing GET. In production, consider protecting this endpoint.
  if (request.method !== 'GET') { // Changed to GET for easier testing
    return response.status(405).json({ error: 'Method Not Allowed', message: 'Only GET requests are allowed for testing.' });
  }

  try {
    console.log('Starting card sync process...');

    // Fetch Master Duel banlist
    console.log('Fetching Master Duel banlist...');
    const masterDuelBanlistResponse = await fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json');
    if (!masterDuelBanlistResponse.ok) {
      throw new Error(`Master Duel Banlist API responded with status ${masterDuelBanlistResponse.status}`);
    }
    const masterDuelBanlist: { [konami_id: string]: number } = await masterDuelBanlistResponse.json();
    console.log(`Master Duel Banlist fetched. Sample (first 5): ${JSON.stringify(Object.fromEntries(Object.entries(masterDuelBanlist).slice(0, 5)))}`);


    // Helper to convert banlist quantity to string
    const getMasterDuelBanStatus = (konami_id: string): string | null => {
      const quantity = masterDuelBanlist[konami_id];
      if (quantity === 0) return "Forbidden";
      if (quantity === 1) return "Limited";
      if (quantity === 2) return "Semi-Limited";
      return null; // Not on banlist or quantity > 2
    };

    console.log('Fetching YGOPRODeck card data...');
    const ygoprodeckApiResponse = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes');
    if (!ygoprodeckApiResponse.ok) {
      throw new Error(`YGOPRODeck API responded with status ${ygoprodeckApiResponse.status}`);
    }
    const { data: allCards } = await ygoprodeckApiResponse.json();
    console.log(`YGOPRODeck API fetched. Total cards: ${allCards ? allCards.length : 0}`);


    if (!allCards || allCards.length === 0) {
      return response.status(200).json({ message: 'No cards found from YGOPRODeck API to sync.' });
    }

    const cardsToUpsert = allCards.map((card: any) => {
      const konamiId = String(card.konami_id);
      const banStatus = getMasterDuelBanStatus(konamiId);
      
      // Log for a few sample cards to check ban status assignment
      if (Math.random() < 0.001) { // Log ~0.1% of cards
        console.log(`Card: ${card.name}, Konami ID: ${konamiId}, MD Ban Status: ${banStatus}`);
      }

      return {
        id: String(card.id),
        name: card.name,
        pt_name: null, // Set to null as misc=yes endpoint does not provide pt_name
        type: card.type,
        description: card.desc,
        race: card.race,
        attribute: card.attribute || null,
        atk: card.atk || null,
        // Corrected: Handle '?' for DEF and ensure it's a number or null
        def: (card.def !== undefined && card.def !== null && String(card.def).toLowerCase() !== '?') ? Number(card.def) : null,
        level: card.level || null,
        image_url: card.card_images?.[0]?.image_url || '',
        image_url_small: card.card_images?.[0]?.image_url_small || '',
        ban_tcg: card.banlist_info?.ban_tcg || null,
        ban_ocg: card.banlist_info?.ban_ocg || null,
        ban_master_duel: banStatus, // Populate Master Duel ban status
      };
    });

    console.log(`Attempting to upsert ${cardsToUpsert.length} cards into Supabase.`);
    // Upsert data into Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(cardsToUpsert, { onConflict: 'id' }); // Conflict on 'id' to update existing records

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully synced ${cardsToUpsert.length} cards.`);
    return response.status(200).json({ message: `Successfully synced ${cardsToUpsert.length} cards.` });

  } catch (error) {
    console.error('Error syncing cards:', error);
    response.status(500).json({ error: 'Failed to sync cards', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
