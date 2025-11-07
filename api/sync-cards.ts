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
    const ygoprodeckApiResponse = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes');
    if (!ygoprodeckApiResponse.ok) {
      throw new Error(`YGOPRODeck API responded with status ${ygoprodeckApiResponse.status}`);
    }
    const { data: allCards } = await ygoprodeckApiResponse.json();

    if (!allCards || allCards.length === 0) {
      return response.status(200).json({ message: 'No cards found from YGOPRODeck API to sync.' });
    }

    const cardsToUpsert = allCards.map((card: any) => ({
      id: String(card.id),
      name: card.name,
      pt_name: card.name, // YGOPRODeck API doesn't provide pt_name directly in this endpoint, will use English name for now.
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
    }));

    // Upsert data into Supabase
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(cardsToUpsert, { onConflict: 'id' }); // Conflict on 'id' to update existing records

    if (upsertError) {
      throw upsertError;
    }

    return response.status(200).json({ message: `Successfully synced ${cardsToUpsert.length} cards.` });

  } catch (error) {
    console.error('Error syncing cards:', error);
    response.status(500).json({ error: 'Failed to sync cards', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
