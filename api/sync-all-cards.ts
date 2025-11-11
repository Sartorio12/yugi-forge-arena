import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export default async function (request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed', message: 'Only GET requests are allowed for testing.' });
  }

  try {
    console.log('Starting full card sync process (English and Portuguese names)...');

    // Step 1: Fetch all cards in English
    console.log('Fetching all cards from YGOPRODeck (English)...');
    const allCardsResponse = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    if (!allCardsResponse.ok) {
      throw new Error(`YGOPRODeck API responded with status ${allCardsResponse.status}`);
    }
    const { data: allEnglishCards } = await allCardsResponse.json();
    console.log(`Total English cards fetched: ${allEnglishCards.length}`);

    const cardsToUpsert: any[] = [];
    const batchSize = 50; // Process in batches to avoid overwhelming the API and Vercel limits

    for (let i = 0; i < allEnglishCards.length; i += batchSize) {
      const batch = allEnglishCards.slice(i, i + batchSize);
      await Promise.all(batch.map(async (card: any) => {
        let ptName: string | null = null;
        try {
          // Step 2: For each English card, try to fetch its Portuguese translation
          // Corrected: Use konami_id as the parameter name
          const ptCardResponse = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?konami_id=${card.id}&language=pt`);
          if (ptCardResponse.ok) {
            const { data: ptCardData } = await ptCardResponse.json();
            if (ptCardData && ptCardData.length > 0 && typeof ptCardData[0].name === 'string' && ptCardData[0].name.trim() !== '') {
              // Only assign ptName if it's actually a different name (i.e., a translation)
              if (ptCardData[0].name.toLowerCase() !== card.name.toLowerCase()) {
                ptName = ptCardData[0].name;
              }
            }
          } else {
            console.warn(`Could not fetch YGOPRODeck PT info for card ID ${card.id}: ${ptCardResponse.statusText}`);
          }
        } catch (ptError) {
          console.warn(`Error fetching PT name for card ID ${card.id}:`, ptError);
        }

        cardsToUpsert.push({
          id: String(card.id),
          name: card.name,
          pt_name: ptName,
          type: card.type,
          description: card.desc,
          race: card.race,
          attribute: card.attribute || null,
          atk: card.atk || null,
          def: (card.def !== undefined && card.def !== null && String(card.def).toLowerCase() !== '?') ? Number(card.def) : null,
          level: card.level || null,
          image_url: card.card_images?.[0]?.image_url || '',
          image_url_small: card.card_images?.[0]?.image_url_small || '',
          ban_tcg: card.banlist_info?.ban_tcg || null,
          ban_ocg: card.banlist_info?.ban_ocg || null,
          // ban_master_duel will be handled by a separate sync function
          ban_master_duel: null, 
        });
      }));
      // Add a small delay between batches to respect API rate limits and Vercel limits
      await new Promise(resolve => setTimeout(resolve, 500)); 
    }

    console.log(`Finished processing details for ${cardsToUpsert.length} cards.`);

    // Step 3: Upsert into Supabase
    console.log(`Attempting to upsert ${cardsToUpsert.length} cards into Supabase.`);
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(cardsToUpsert, { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase Upsert Error:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully synced ${cardsToUpsert.length} cards (English and Portuguese names).`);
    return response.status(200).json({ message: `Successfully synced ${cardsToUpsert.length} cards.` });

  } catch (error) {
    console.error('Error syncing all cards:', error);
    response.status(500).json({ error: 'Failed to sync all cards', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
