import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

interface YgoProDeckCard {
  id: number;
  konami_id: string;
  name: string;
  type: string;
  desc: string;
  race: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  card_images?: {
    image_url: string;
    image_url_small: string;
  }[];
  banlist_info?: {
    ban_tcg?: string;
    ban_ocg?: string;
  };
}

interface CardInsert {
    id: string;
    konami_id: string;
    name: string;
    pt_name: string | null;
    type: string;
    description: string;
    race: string;
    attribute: string | null;
    atk: number | null;
    def: number | null;
    level: number | null;
    image_url: string;
    image_url_small: string;
    ban_tcg: string | null;
    ban_ocg: string | null;
}

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
      throw new Error(`YGOPRODeck API (English) responded with status ${allCardsResponse.status}`);
    }
    const { data: allEnglishCards }: { data: YgoProDeckCard[] } = await allCardsResponse.json() as { data: YgoProDeckCard[] };
    console.log(`Total English cards fetched: ${allEnglishCards.length}`);

    // Step 2: Fetch all cards in Portuguese
    console.log('Fetching all cards from YGOPRODeck (Portuguese)...');
    const allPtCardsResponse = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?language=pt');
    if (!allPtCardsResponse.ok) {
      console.warn(`YGOPRODeck API (Portuguese) responded with status ${allPtCardsResponse.status}. Portuguese names might be incomplete.`);
      // Continue even if Portuguese fetch fails, just pt_name will be null
    }
    const { data: allPortugueseCards }: { data: YgoProDeckCard[] } = allPtCardsResponse.ok ? await allPtCardsResponse.json() as { data: YgoProDeckCard[] } : { data: [] };
    console.log(`Total Portuguese cards fetched: ${allPortugueseCards.length}`);

    // Create a map for quick lookup of Portuguese names by card ID
    const ptNameMap = new Map<string, string>();
    for (const ptCard of allPortugueseCards) {
      if (ptCard.id && ptCard.name) {
        ptNameMap.set(String(ptCard.id), ptCard.name);
      }
    }
    console.log(`Portuguese name map created with ${ptNameMap.size} entries.`);

    const cardsToUpsert: CardInsert[] = [];
    const batchSize = 50; // Process in batches for Supabase upsert

    for (let i = 0; i < allEnglishCards.length; i += batchSize) {
      const batch = allEnglishCards.slice(i, i + batchSize);
      const processedBatch = batch.map((card: YgoProDeckCard) => {
        let ptName: string | null = null;
        const fetchedPtName = ptNameMap.get(String(card.id));
        if (fetchedPtName && fetchedPtName.toLowerCase() !== card.name.toLowerCase()) {
          ptName = fetchedPtName;
        }

        return {
          id: String(card.id),
          konami_id: String(card.konami_id),
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
        };
      });
      cardsToUpsert.push(...processedBatch);
      // No need for delay here, as individual API calls are removed
    }

    console.log(`Finished processing details for ${cardsToUpsert.length} cards.`);

    // Step 3: Upsert into Supabase
    console.log(`Attempting to upsert ${cardsToUpsert.length} cards into Supabase.`);
    // Supabase upsert also benefits from batching, but the client handles it to some extent.
    // For very large arrays, consider breaking this into smaller upsert calls.
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