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
    console.log('Starting Master Duel Banlist sync process...');

    // Fetch Master Duel banlist
    console.log('Fetching Master Duel banlist...');
    const masterDuelBanlistResponse = await fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json');
    if (!masterDuelBanlistResponse.ok) {
      throw new Error(`Master Duel Banlist API responded with status ${masterDuelBanlistResponse.status}`);
    }
    const masterDuelBanlistData: { date: string; regulation: { [konami_id: string]: number } } = await masterDuelBanlistResponse.json();
    const masterDuelRegulation = masterDuelBanlistData.regulation;
    console.log(`Master Duel Banlist fetched. Total entries: ${Object.keys(masterDuelRegulation).length}`);

    const banlistUpdates: { id: string; ban_master_duel: string | null }[] = [];

    for (const mdKonamiId in masterDuelRegulation) {
      const quantity = masterDuelRegulation[mdKonamiId];
      let banStatus: string | null = null;
      if (quantity === 0) banStatus = "Forbidden";
      else if (quantity === 1) banStatus = "Limited";
      else if (quantity === 2) banStatus = "Semi-Limited";

      banlistUpdates.push({
        id: String(mdKonamiId), // Use Konami ID as primary key for update
        ban_master_duel: banStatus,
      });
    }

    console.log(`Attempting to update banlist status for ${banlistUpdates.length} cards in Supabase.`);
    // Use upsert to update only the ban_master_duel column for existing cards
    // onConflict 'id' ensures that if a card doesn't exist, it won't be inserted,
    // but if it does, only ban_master_duel will be updated.
    const { error: upsertError } = await supabaseAdmin
      .from('cards')
      .upsert(banlistUpdates, { onConflict: 'id', ignoreDuplicates: false }); // ignoreDuplicates: false means it will update existing rows

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