import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Define interfaces for the API responses
interface YgoProDeckCardInfo {
  id: number;
  konami_id: number;
  name: string;
}

interface MasterDuelBanlist {
  date: string;
  regulation: { [konami_id: string]: number };
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
    return response.status(405).json({ error: 'Method Not Allowed', message: 'Only GET requests are allowed.' });
  }

  try {
    console.log('Starting Master Duel Banlist sync process...');

    // Step 1: Fetch the entire card database from YGOPRODeck to create a reliable mapping.
    console.log('Fetching all cards from YGOPRODeck to build konami_id map...');
    const allCardsResponse = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    if (!allCardsResponse.ok) {
      throw new Error(`YGOPRODeck API (all cards) responded with status ${allCardsResponse.status}`);
    }
    const { data: allCardsData }: { data: YgoProDeckCardInfo[] } = await allCardsResponse.json() as { data: YgoProDeckCardInfo[] };
    console.log(`Fetched ${allCardsData.length} cards from YGOPRODeck.`);

    // Step 2: Create a map from konami_id to our primary key (YGOPRODeck id)
    const konamiIdToPrimaryKeyMap = new Map<string, string>();
    for (const card of allCardsData) {
      if (card.konami_id) {
        konamiIdToPrimaryKeyMap.set(String(card.konami_id), String(card.id));
      }
    }
    console.log(`Created konami_id -> primary_key map with ${konamiIdToPrimaryKeyMap.size} entries.`);

    // Step 3: Fetch the Master Duel banlist
    console.log('Fetching Master Duel banlist...');
    const masterDuelBanlistResponse = await fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json');
    if (!masterDuelBanlistResponse.ok) {
      throw new Error(`Master Duel Banlist API responded with status ${masterDuelBanlistResponse.status}`);
    }
    const masterDuelBanlistData: MasterDuelBanlist = await masterDuelBanlistResponse.json();
    const masterDuelRegulation = masterDuelBanlistData.regulation;
    const konamiIdsFromBanlist = Object.keys(masterDuelRegulation);
    console.log(`Master Duel Banlist fetched. Total entries: ${konamiIdsFromBanlist.length}`);

    if (konamiIdsFromBanlist.length === 0) {
      console.log('No cards found in the banlist. Exiting.');
      return response.status(200).json({ message: 'No cards found in the banlist.' });
    }

    // Step 4: Build the array of updates for Supabase using the map
    const banlistUpdates: { id: string; ban_master_duel: string }[] = [];
    let notFoundCount = 0;
    for (const konamiId in masterDuelRegulation) {
      const primaryKey = konamiIdToPrimaryKeyMap.get(konamiId);
      if (primaryKey) {
        const quantity = masterDuelRegulation[konamiId];
        let banStatus: string | null = null;
        if (quantity === 0) banStatus = "Forbidden";
        else if (quantity === 1) banStatus = "Limited";
        else if (quantity === 2) banStatus = "Semi-Limited";

        if (banStatus) {
          banlistUpdates.push({
            id: primaryKey, // Use the correct primary key for the update
            ban_master_duel: banStatus,
          });
        }
      } else {
        notFoundCount++;
        // console.log(`Warning: No YGOPRODeck primary key found for Konami ID: ${konamiId}`);
      }
    }
    console.log(`Found matches for ${banlistUpdates.length} cards. Did not find ${notFoundCount} cards.`);

    if (banlistUpdates.length === 0) {
      console.log('No valid banlist updates to apply.');
      return response.status(200).json({ message: 'No valid banlist updates to apply after mapping.' });
    }

    // Step 5: Upsert the updates into Supabase
    console.log(`Attempting to update banlist status for ${banlistUpdates.length} cards in Supabase.`);
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(banlistUpdates, { onConflict: 'id' });

    if (upsertError) {
      console.error('Supabase Banlist Upsert Error:', upsertError);
      throw upsertError;
    }

    console.log(`Successfully synced banlist status for ${banlistUpdates.length} cards.`);
    return response.status(200).json({ message: `Successfully synced banlist status for ${banlistUpdates.length} cards.` });

  } catch (error) {
    console.error('Error syncing banlist:', error);
    response.status(500).json({ error: 'Failed to sync banlist', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}