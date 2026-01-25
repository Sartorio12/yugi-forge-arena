import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

// Use Service Role Key for admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function syncTierList(supabase) {
  try {
    console.log('Starting Tier List Sync...');
    const response = await fetch('https://www.masterduelmeta.com/tier-list');
    const text = await response.text();

    const tiers = [
        { name: 'Tier 1', id: 1 },
        { name: 'Tier 2', id: 2 },
        { name: 'Tier 3', id: 3 }
    ];
    
    const tierDecks = [];
    
    // Find positions of Tier headers
    const positions = tiers.map(t => ({ 
        ...t, 
        index: text.indexOf(`alt="${t.name}"`) 
    })).filter(t => t.index !== -1).sort((a,b) => a.index - b.index);
    
    let highPotIndex = text.indexOf('High Potential');
    if (highPotIndex === -1) highPotIndex = text.length;

    for (let i = 0; i < positions.length; i++) {
        const current = positions[i];
        const nextIndex = (i < positions.length - 1) ? positions[i+1].index : highPotIndex;
        
        const content = text.substring(current.index, nextIndex);
        
        // Find links: href="/tier-list/deck-types/..."
        const deckMatches = [...content.matchAll(/href="\/tier-list\/deck-types\/([^"]*)"/g)];
        
        const uniqueDecks = new Set();
        
        for (const m of deckMatches) {
            let deckSlug = m[1];
            
            // Look ahead for Power Score (increased range to skip long srcset)
            // match.index is relative to 'content' string
            const lookAhead = content.substring(m.index, m.index + 4000);
            const powerMatch = lookAhead.match(/Power:\s*<b>([\d\.]+)<\/b>/);
            const powerScore = powerMatch ? parseFloat(powerMatch[1]) : null;

            deckSlug = deckSlug.split('?')[0];
            const deckName = decodeURIComponent(deckSlug).replace(/-/g, ' '); 
            
            if (uniqueDecks.has(deckName)) continue;
            uniqueDecks.add(deckName);

            // Construct Image URL based on the slug found in href
            const imageUrl = `https://imgserv.duellinksmeta.com/v2/mdm/deck-type/${deckSlug}?portrait=true&width=140`;

            tierDecks.push({
                deck_name: deckName,
                tier: current.id,
                power_score: powerScore,
                image_url: imageUrl,
                last_updated: new Date()
            });
        }
    }

    if (tierDecks.length > 0) {
        console.log(`Found ${tierDecks.length} tier decks. Updating DB...`);
        
        // Clear old list
        const { error: delError } = await supabase.from('tier_list').delete().neq('id', 0); // Delete all
        if (delError) console.error('Error clearing tier_list:', delError);

        // Insert new
        const { error: insError } = await supabase.from('tier_list').insert(tierDecks);
        if (insError) console.error('Error inserting tier_list:', insError);
        else console.log('Tier List updated successfully.');
    } else {
        console.warn('No tier decks found during scrape.');
    }

  } catch (e) {
    console.error('Error in syncTierList:', e);
  }
}

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
    console.log('Starting Daily Maintenance (Sync All Cards + Banlists + Tier List)...');

    // Launch Tier List Sync in parallel (fire and forget or await?)
    // Let's await it to log completion properly
    await syncTierList(supabaseAdmin);

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
    
    const banlistFetchFailed = !mdBanlistRes.ok;
    if (banlistFetchFailed) console.warn(`MD Banlist API failed: ${mdBanlistRes.status}`);

    const englishData = await englishCardsRes.json();
    const allEnglishCards = englishData.data;
    
    const portugueseData = portugueseCardsRes.ok ? await portugueseCardsRes.json() : { data: [] };
    const allPortugueseCards = portugueseData.data || [];

    const mdBanlistData = !banlistFetchFailed ? await mdBanlistRes.json() : { regulation: {} };
    const mdRegulation = mdBanlistData?.regulation || {};

    // SAFETY CHECK: Ensure regulation list is not empty/suspiciously small
    if (!banlistFetchFailed && Object.keys(mdRegulation).length < 50) {
        console.warn(`MD Regulation list is suspiciously small (${Object.keys(mdRegulation).length} items). Aborting banlist update to prevent data loss.`);
        banlistFetchFailed = true;
    }

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
        const konamiIdStr = String(card.misc_info?.[0]?.konami_id || card.id);

        // Determine Portuguese Name
        let ptName = null;
        const fetchedPtName = ptNameMap.get(cardIdStr);
        if (fetchedPtName && fetchedPtName.toLowerCase() !== card.name.toLowerCase()) {
            ptName = fetchedPtName;
        }

        // Determine Master Duel Ban Status
        // Use the Konami ID to lookup in the MD Regulation map
        const mdStatus = mdBanStatusMap.get(konamiIdStr) || null;

        const cardObj = {
            id: cardIdStr,
            konami_id: konamiIdStr,
            name: card.name,
            pt_name: ptName,
            type: card.type,
            description: card.desc,
            race: card.race,
            archetype: card.archetype || null,
            attribute: card.attribute || null,
            atk: card.atk || null,
            def: (card.def !== undefined && card.def !== null && String(card.def).toLowerCase() !== '?') ? Number(card.def) : null,
            level: card.level || null,
            image_url: card.card_images?.[0]?.image_url || '',
            image_url_small: card.card_images?.[0]?.image_url_small || '',
            ban_tcg: card.banlist_info?.ban_tcg || null,
            ban_ocg: card.banlist_info?.ban_ocg || null,
            genesys_points: card.misc_info?.[0]?.genesys_points || 0,
            md_rarity: card.misc_info?.[0]?.md_rarity || null,
        };

        if (!banlistFetchFailed) {
            cardObj.ban_master_duel = mdStatus;
        }

        cardsToUpsert.push(cardObj);
    }

    console.log(`Prepared ${cardsToUpsert.length} cards from API.`);

    // --- OPTIMIZATION: FETCH CURRENT STATE & COMPARE ---
    console.log('Fetching current DB state for comparison...');
    
    // Function to fetch all existing card signatures
    const fetchCurrentDbState = async () => {
        let allRows = [];
        let page = 0;
        const pageSize = 1000; // Safer page size
        let hasMore = true;
        
        while (hasMore) {
            const { data, error } = await supabaseAdmin
                .from('cards')
                .select('id, name, pt_name, ban_master_duel, md_rarity, genesys_points, image_url, archetype')
                .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (error) {
                console.error(`Error fetching page ${page}:`, error);
                throw error;
            }
            
            if (data.length > 0) {
                // console.log(`Fetched page ${page}: ${data.length} rows`);
                allRows = allRows.concat(data);
                
                // If we got fewer rows than requested, we reached the end
                if (data.length < pageSize) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
            
            // Safety break
            if (page > 50) { // Increased limit for 1000 pageSize (50k cards max)
                console.warn("Reached max pagination safety limit, stopping DB fetch.");
                hasMore = false;
            }
        }
        return allRows;
    };

    const currentDbCards = await fetchCurrentDbState();
    const dbCardMap = new Map();
    currentDbCards.forEach(c => dbCardMap.set(String(c.id), c));

    console.log(`Fetched ${currentDbCards.length} existing cards from DB.`);

    const cardsToUpdate = cardsToUpsert.filter(newCard => {
        const existing = dbCardMap.get(newCard.id);
        
        // If it's a new card, we must upsert
        if (!existing) return true;

        // Compare fields (Strict equality check)
        // We only check fields that are critical or dynamic. 
        // Note: description is skipped to save DB read bandwidth, assuming usually name/stats/image update with text.
        // If you need perfect text sync, add 'description' to the select above and check it here.
        const hasChanged = 
            existing.name !== newCard.name ||
            existing.pt_name !== newCard.pt_name ||
            (!banlistFetchFailed && existing.ban_master_duel !== newCard.ban_master_duel) ||
            existing.md_rarity !== newCard.md_rarity ||
            existing.genesys_points !== newCard.genesys_points ||
            existing.image_url !== newCard.image_url ||
            existing.archetype !== newCard.archetype;

        return hasChanged;
    });

    console.log(`Optimization: Skipping ${cardsToUpsert.length - cardsToUpdate.length} unchanged cards.`);
    console.log(`Proceeding to upsert ${cardsToUpdate.length} cards...`);

    // 4. Upsert to Supabase in batches
    if (cardsToUpdate.length > 0) {
        const BATCH_SIZE = 1000;
        const totalBatches = Math.ceil(cardsToUpdate.length / BATCH_SIZE);
        for (let i = 0; i < cardsToUpdate.length; i += BATCH_SIZE) {
            const batchNum = (i / BATCH_SIZE) + 1;
            // console.log(`Upserting batch ${batchNum}/${totalBatches}...`);
            const batch = cardsToUpdate.slice(i, i + BATCH_SIZE);
            const { error } = await supabaseAdmin
                .from('cards')
                .upsert(batch, { onConflict: 'id' });
            
            if (error) {
                console.error(`Error upserting batch ${batchNum}:`, error);
                throw error; 
            }
        }
        console.log(`Finished upserting ${cardsToUpdate.length} cards.`);
    } else {
        console.log("No cards to update/insert.");
    }

    console.log('Daily Maintenance completed successfully.');
    return res.status(200).json({ 
        message: `Sync Complete. Total: ${cardsToUpsert.length}. Updated/Inserted: ${cardsToUpdate.length}. Skipped: ${cardsToUpsert.length - cardsToUpdate.length}.` 
    });

  } catch (error) {
    console.error('Error in Daily Maintenance:', error);
    return res.status(500).json({ 
        error: 'Internal Server Error', 
        details: error.message || 'Unknown error' 
    });
  }
}
