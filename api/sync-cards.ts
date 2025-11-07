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
    console.log('Starting card sync process...');

    // Fetch Master Duel banlist
    console.log('Fetching Master Duel banlist...');
    const masterDuelBanlistResponse = await fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json');
    if (!masterDuelBanlistResponse.ok) {
      throw new Error(`Master Duel Banlist API responded with status ${masterDuelBanlistResponse.status}`);
    }
    const masterDuelBanlistData: { date: string; regulation: { [konami_id: string]: number } } = await masterDuelBanlistResponse.json();
    const masterDuelRegulation = masterDuelBanlistData.regulation;
    console.log(`Master Duel Banlist fetched. Total entries: ${Object.keys(masterDuelRegulation).length}`);

    // Create a map for YGOPRODeck ID to Master Duel Ban Status
    const ygoprodeckIdToMDBanStatus: { [ygoprodeck_id: string]: string } = {};

    console.log('Mapping Master Duel banlist Konami IDs to YGOPRODeck IDs...');
    console.warn('WARNING: This process involves multiple API calls to YGOPRODeck for each banlisted card. This can be slow and may hit API rate limits.');

    const banlistKonamiIds = Object.keys(masterDuelRegulation);
    const batchSize = 20; // Process in batches to avoid overwhelming the API
    for (let i = 0; i < banlistKonamiIds.length; i += batchSize) {
      const batch = banlistKonamiIds.slice(i, i + batchSize);
      await Promise.all(batch.map(async (mdKonamiId) => {
        try {
          const ygoprodeckCardResponse = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?konami_id=${mdKonamiId}`);
          if (!ygoprodeckCardResponse.ok) {
            console.warn(`Could not fetch YGOPRODeck info for Konami ID ${mdKonamiId}: ${ygoprodeckCardResponse.statusText}`);
            return;
          }
          const { data: cardData } = await ygoprodeckCardResponse.json();
          if (cardData && cardData.length > 0) {
            const ygoprodeckId = String(cardData[0].id); // Get the YGOPRODeck ID
            const quantity = masterDuelRegulation[mdKonamiId];
            let banStatus: string | null = null;
            if (quantity === 0) banStatus = "Forbidden";
            else if (quantity === 1) banStatus = "Limited";
            else if (quantity === 2) banStatus = "Semi-Limited";

            if (banStatus) {
              ygoprodeckIdToMDBanStatus[ygoprodeckId] = banStatus;
            }
          }
        } catch (error) {
          console.error(`Error processing Master Duel Konami ID ${mdKonamiId}:`, error);
        }
      }));
      // Optional: Add a small delay between batches if hitting rate limits
      // await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log(`Finished mapping ${Object.keys(ygoprodeckIdToMDBanStatus).length} banlisted cards.`);


    console.log('Fetching YGOPRODeck all card data...');
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
      const ygoprodeckCardId = String(card.id);
      const banStatus = ygoprodeckIdToMDBanStatus[ygoprodeckCardId] || null; // Look up ban status using YGOPRODeck ID
      
      // Log for a few sample cards to check ban status assignment
      if (Math.random() < 0.001) { // Log ~0.1% of cards
        console.log(`Card: ${card.name}, YGOPRODeck ID: ${ygoprodeckCardId}, MD Ban Status: ${banStatus}`);
      }

      return {
        id: ygoprodeckCardId, // Use YGOPRODeck ID as primary key
        name: card.name,
        pt_name: null,
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
        ban_master_duel: banStatus, // Populate Master Duel ban status
      };
    });

    console.log(`Attempting to upsert ${cardsToUpsert.length} cards into Supabase.`);
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(cardsToUpsert, { onConflict: 'id' });

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