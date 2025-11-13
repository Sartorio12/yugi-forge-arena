import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Define interfaces for the API responses
interface YgoProDeckCardInfo {
  id: number;          // This is the YGOPRODeck ID, which is our primary key
  konami_id: number;   // The official Konami ID
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
  // We should not proceed if the client cannot be created.
  // In a real scenario, you might want to throw an error or handle this differently.
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export default async function (request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed', message: 'Only GET requests are allowed.' });
  }

  try {
    console.log('Starting Master Duel Banlist sync process...');

    // Step 1: Fetch the Master Duel banlist
    console.log('Fetching Master Duel banlist...');
    const masterDuelBanlistResponse = await fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json');
    if (!masterDuelBanlistResponse.ok) {
      throw new Error(`Master Duel Banlist API responded with status ${masterDuelBanlistResponse.status}`);
    }
    const masterDuelBanlistData: MasterDuelBanlist = await masterDuelBanlistResponse.json();
    console.log('Master Duel Banlist Data:', JSON.stringify(masterDuelBanlistData, null, 2));
    const masterDuelRegulation = masterDuelBanlistData.regulation;
    const konamiIds = Object.keys(masterDuelRegulation);
    console.log(`Master Duel Banlist fetched. Total entries: ${konamiIds.length}`);
    console.log('Konami IDs from banlist:', konamiIds.slice(0, 10)); // Log first 10 for brevity

    if (konamiIds.length === 0) {
      console.log('No cards found in the banlist. Exiting.');
      return response.status(200).json({ message: 'No cards found in the banlist.' });
    }

    // Step 2: Fetch card info from YGOPRODeck API using the konami_ids to get the mapping
    console.log(`Fetching card info from YGOPRODeck for ${konamiIds.length} konami_ids...`);
    const ygoproDeckUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?konami_id=${konamiIds.join(',')}`;
    console.log('YGOPRODeck API URL:', ygoproDeckUrl);
    const cardInfoResponse = await fetch(ygoproDeckUrl);
    if (!cardInfoResponse.ok) {
      throw new Error(`YGOPRODeck API responded with status ${cardInfoResponse.status}`);
    }
    const { data: cardInfoData }: { data: YgoProDeckCardInfo[] } = await cardInfoResponse.json() as { data: YgoProDeckCardInfo[] };
    console.log(`Successfully fetched info for ${cardInfoData.length} cards from YGOPRODeck.`);
    console.log('YGOPRODeck Card Info Data (first 5):', JSON.stringify(cardInfoData.slice(0, 5), null, 2));

    // Step 3: Create a map from konami_id to our primary key (YGOPRODeck id)
    const konamiIdToPrimaryKeyMap = new Map<string, string>();
    for (const card of cardInfoData) {
      konamiIdToPrimaryKeyMap.set(String(card.konami_id), String(card.id));
    }
    console.log(`Created konami_id -> primary_key map with ${konamiIdToPrimaryKeyMap.size} entries.`);
    console.log('Konami ID to Primary Key Map (sample):', Array.from(konamiIdToPrimaryKeyMap.entries()).slice(0, 5));

    // Step 4: Build the array of updates for Supabase
    const banlistUpdates: { id: string; ban_master_duel: string }[] = [];
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
        console.log(`Warning: No YGOPRODeck primary key found for Konami ID: ${konamiId}`);
      }
    }

    console.log(`Prepared ${banlistUpdates.length} banlist updates.`);
    console.log('Banlist Updates (first 5):', JSON.stringify(banlistUpdates.slice(0, 5), null, 2));

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
