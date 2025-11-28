import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Interfaces
interface YgoProDeckCard {
  id: number;
  konami_id: number; // API sometimes returns this as number, sometimes string. Handle carefully.
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
  misc_info?: {
    genesys_points?: number;
    md_rarity?: string;
  }[];
}

interface MasterDuelBanlist {
  date: string;
  regulation: { [konami_id: string]: number };
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
    ban_master_duel: string | null; // Merged field
    genesys_points?: number;
    md_rarity: string | null;
}

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

export default async function (request: VercelRequest, response: VercelResponse) {
  // Allow GET for testing, but typically Cron jobs are GET
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('Starting Daily Maintenance (Sync All Cards + Banlists)...');

    // --- PARALLEL FETCHING START ---
    console.log('Fetching data sources in parallel...');
    const [englishCardsRes, portugueseCardsRes, mdBanlistRes] = await Promise.all([
        fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes&format=Genesys'),
        fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?language=pt'),
        fetch('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json')
    ]);

    // Check responses
    if (!englishCardsRes.ok) throw new Error(`English API failed: ${englishCardsRes.status}`);
    // Portuguese might fail (optional)
    if (!portugueseCardsRes.ok) console.warn(`Portuguese API failed: ${portugueseCardsRes.status}`);
    // MD Banlist might fail (optional, but we want it)
    if (!mdBanlistRes.ok) console.warn(`MD Banlist API failed: ${mdBanlistRes.status}`);

    const englishData = await englishCardsRes.json() as { data: YgoProDeckCard[] };
    const allEnglishCards = englishData.data;
    
    const portugueseData = portugueseCardsRes.ok ? await portugueseCardsRes.json() as { data: YgoProDeckCard[] } : { data: [] };
    const allPortugueseCards = portugueseData.data || [];

    const mdBanlistData = mdBanlistRes.ok ? await mdBanlistRes.json() as MasterDuelBanlist : { regulation: {} };
    const mdRegulation = mdBanlistData?.regulation || {};
    // --- PARALLEL FETCHING END ---

    console.log(`Fetched: ${allEnglishCards.length} English Cards, ${allPortugueseCards.length} Portuguese Cards`);

    // 1. Create Portuguese Name Map
    const ptNameMap = new Map<string, string>();
    for (const ptCard of allPortugueseCards) {
      if (ptCard.id && ptCard.name) {
        ptNameMap.set(String(ptCard.id), ptCard.name);
      }
    }

    // 2. Prepare Master Duel Banlist Lookup
    // The banlist keys are KONAMI IDs (string), values are quantity (0, 1, 2, 3)
    // We need to map: KonamiID -> BanStatus String
    const mdBanStatusMap = new Map<string, string>();
    for (const [kId, quantity] of Object.entries(mdRegulation)) {
        let status = null;
        if (quantity === 0) status = 'Forbidden';
        else if (quantity === 1) status = 'Limited';
        else if (quantity === 2) status = 'Semi-Limited';
        
        if (status) mdBanStatusMap.set(String(kId), status);
    }

    // 3. Process Cards
    const cardsToUpsert: CardInsert[] = [];
    // Process in chunks locally if needed, but for preparing the array, we can do one pass
    
    for (const card of allEnglishCards) {
        const cardIdStr = String(card.id);
        const konamiIdStr = String(card.konami_id || card.id); // Fallback if konami_id missing

        // Determine Portuguese Name
        let ptName: string | null = null;
        const fetchedPtName = ptNameMap.get(cardIdStr);
        if (fetchedPtName && fetchedPtName.toLowerCase() !== card.name.toLowerCase()) {
            ptName = fetchedPtName;
        }

        // Determine Master Duel Ban Status
        // Check using Konami ID first
        const mdStatus = mdBanStatusMap.get(konamiIdStr) || null;

        cardsToUpsert.push({
            id: cardIdStr,
            konami_id: konamiIdStr,
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
            ban_master_duel: mdStatus, // NEW MERGED FIELD
            genesys_points: card.misc_info?.[0]?.genesys_points || 0,
            md_rarity: card.misc_info?.[0]?.md_rarity || null,
        });
    }

    console.log(`Prepared ${cardsToUpsert.length} cards for upsert.`);

    // 4. Upsert to Supabase in batches
    // Although client handles some batching, for 12k+ cards, manual batching is safer for timeouts
    const BATCH_SIZE = 1000;
    for (let i = 0; i < cardsToUpsert.length; i += BATCH_SIZE) {
        const batch = cardsToUpsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin
            .from('cards')
            .upsert(batch, { onConflict: 'id' });
        
        if (error) {
            console.error(`Error upserting batch ${i}-${i+BATCH_SIZE}:`, error);
            // We might continue or throw. Throwing ensures we know it failed.
            throw error; 
        }
        console.log(`Upserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(cardsToUpsert.length / BATCH_SIZE)}`);
    }

    console.log('Daily Maintenance completed successfully.');
    return response.status(200).json({ 
        message: `Successfully synced ${cardsToUpsert.length} cards (Info + Banlists).` 
    });

  } catch (error) {
    console.error('Error in Daily Maintenance:', error);
    return response.status(500).json({ 
        error: 'Internal Server Error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
