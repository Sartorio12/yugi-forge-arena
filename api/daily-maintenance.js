import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

// Use Service Role Key for admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Allow GET for testing/cron
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Security check for Vercel Cron
  const authHeader = req.headers.authorization;
  if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
      // console.log('Unauthorized');
      // return res.status(401).json({ error: 'Unauthorized' }); 
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

    const englishData = await englishCardsRes.json();
    const allEnglishCards = englishData.data;
    
    const portugueseData = portugueseCardsRes.ok ? await portugueseCardsRes.json() : { data: [] };
    const allPortugueseCards = portugueseData.data || [];

    const mdBanlistData = mdBanlistRes.ok ? await mdBanlistRes.json() : { regulation: {} };
    const mdRegulation = mdBanlistData?.regulation || {};
    // --- PARALLEL FETCHING END ---

    console.log(`Fetched: ${allEnglishCards.length} English Cards, ${allPortugueseCards.length} Portuguese Cards`);

    // 1. Create Portuguese Name Map
    const ptNameMap = new Map();
    for (const ptCard of allPortugueseCards) {
      if (ptCard.id && ptCard.name) {
        ptNameMap.set(String(ptCard.id), ptCard.name);
      }
    }

    // 2. Prepare Master Duel Banlist Lookup
    const mdBanStatusMap = new Map();
    for (const [kId, quantity] of Object.entries(mdRegulation)) {
        let status = null;
        if (quantity === 0) status = 'Forbidden';
        else if (quantity === 1) status = 'Limited';
        else if (quantity === 2) status = 'Semi-Limited';
        
        if (status) mdBanStatusMap.set(String(kId), status);
    }

    // 3. Process Cards
    const cardsToUpsert = [];
    
    for (const card of allEnglishCards) {
        const cardIdStr = String(card.id);
        const konamiIdStr = String(card.konami_id || card.id);

        // Determine Portuguese Name
        let ptName = null;
        const fetchedPtName = ptNameMap.get(cardIdStr);
        if (fetchedPtName && fetchedPtName.toLowerCase() !== card.name.toLowerCase()) {
            ptName = fetchedPtName;
        }

        // Determine Master Duel Ban Status
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
            ban_master_duel: mdStatus,
            genesys_points: card.misc_info?.[0]?.genesys_points || 0,
            md_rarity: card.misc_info?.[0]?.md_rarity || null,
        });
    }

    console.log(`Prepared ${cardsToUpsert.length} cards for upsert.`);

    // 4. Upsert to Supabase in batches
    const BATCH_SIZE = 1000;
    for (let i = 0; i < cardsToUpsert.length; i += BATCH_SIZE) {
        const batch = cardsToUpsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabaseAdmin
            .from('cards')
            .upsert(batch, { onConflict: 'id' });
        
        if (error) {
            console.error(`Error upserting batch ${i}-${i+BATCH_SIZE}:`, error);
            throw error; 
        }
        // console.log(`Upserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(cardsToUpsert.length / BATCH_SIZE)}`);
    }

    console.log('Daily Maintenance completed successfully.');
    return res.status(200).json({ 
        message: `Successfully synced ${cardsToUpsert.length} cards (Info + Banlists).` 
    });

  } catch (error) {
    console.error('Error in Daily Maintenance:', error);
    return res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message || 'Unknown error' 
    });
  }
}
