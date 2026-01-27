import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mggwlfbajeqbdgkflmqi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

// Use Service Role Key for admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

// Helper to fetch card IDs from our DB by Name
async function mapCardNamesToInternalIds(cardNames) {
    if (!cardNames || cardNames.length === 0) return {};

    // Remove duplicates
    const uniqueNames = [...new Set(cardNames)];

    // Fetch from DB
    const { data, error } = await supabaseAdmin
        .from('cards')
        .select('id, name')
        .in('name', uniqueNames);

    if (error) {
        console.error('Error mapping Card Names:', error);
        return {};
    }

    const map = {};
    data.forEach(c => {
        map[c.name] = c.id;
    });
    return map;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // console.log('Unauthorized');
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log("Starting Meta Deck Sync (Optimized Memory Strategy)...");
        const botUserId = META_BOT_ID;

        // 1. Fetch ALL deck types once to avoid multiple API calls and filter issues
        console.log("Fetching all deck types for matching...");
        const allTypesRes = await fetch('https://www.masterduelmeta.com/api/v1/deck-types?limit=1000');
        if (!allTypesRes.ok) throw new Error(`Failed to fetch deck types: ${allTypesRes.status}`);
        const allDeckTypes = await allTypesRes.json();
        console.log(`Loaded ${allDeckTypes.length} deck types.`);

        // 2. Get Tier List to know which archetypes to focus on
        const tierResponse = await fetch('https://www.masterduelmeta.com/tier-list');
        const tierText = await tierResponse.text();
        
        const deckLinks = [...tierText.matchAll(/href="\/tier-list\/deck-types\/([^\"]*)"/g)]
            .map(m => m[1])
            .filter((v, i, a) => a.indexOf(v) === i); 

        console.log(`Found ${deckLinks.length} archetypes on Tier List.`);

        let totalImported = 0;
        // Limit processing to avoid timeout, but we can do more now that matching is fast
        const processLinks = deckLinks.slice(0, 8); 

        for (const slug of processLinks) {
            const archetypeRaw = decodeURIComponent(slug).replace(/-/g, ' ');
            
            // 3. Match Archetype in memory
            const match = allDeckTypes.find(t => t.name.toLowerCase() === archetypeRaw.toLowerCase()) || 
                          allDeckTypes.find(t => t.name.toLowerCase().includes(archetypeRaw.toLowerCase()));

            if (!match) {
                console.warn(`Could not find a match for "${archetypeRaw}" in deck types. Skipping.`);
                continue;
            }

            const deckTypeId = match._id;
            const archetype = match.name;
            console.log(`\nProcessing: ${archetype} (ID: ${deckTypeId})`);

            // 4. Fetch Top Decks for this ID
            const decksApiUrl = `https://www.masterduelmeta.com/api/v1/top-decks?deckType=${deckTypeId}&limit=5&sort=-created`;
            const decksRes = await fetch(decksApiUrl);
            
            if (!decksRes.ok) {
                console.warn(`Failed to fetch decks for ${archetype} (${decksRes.status})`);
                continue;
            }

            const decksData = await decksRes.json();
            if (!Array.isArray(decksData) || decksData.length === 0) {
                console.log(`No decks found for ${archetype}.`);
                continue;
            }

            // 5. Process Each Deck
            for (const d of decksData) {

                const authorName = d.author?.username || 'Unknown';
                const deckName = `${archetype} - ${authorName}`;
                
                // Check if exists
                const { data: existing } = await supabaseAdmin
                    .from('decks')
                    .select('id')
                    .eq('user_id', botUserId)
                    .eq('deck_name', deckName)
                    .maybeSingle();

                if (existing) continue;

                // Collect all card names
                const allCardNames = [
                    ...d.main.map(c => c.card.name),
                    ...d.extra.map(c => c.card.name),
                    ...d.side.map(c => c.card.name)
                ];

                // Map names to IDs
                const nameToIdMap = await mapCardNamesToInternalIds(allCardNames);

                // Create Deck
                const { data: newDeck, error: createError } = await supabaseAdmin
                    .from('decks')
                    .insert({
                        user_id: botUserId,
                        deck_name: deckName,
                        is_private: false,
                        is_genesys: false,
                        // description: `Source: https://www.masterduelmeta.com/top-decks/${d._id}`
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Error creating deck:', createError);
                    continue;
                }

                // Prepare Deck Cards
                const deckCardsPayload = [];
                const processSection = (list, section) => {
                    list.forEach(item => {
                        const internalId = nameToIdMap[item.card.name];
                        if (internalId) {
                            for (let i = 0; i < item.amount; i++) {
                                deckCardsPayload.push({
                                    deck_id: newDeck.id,
                                    card_api_id: internalId,
                                    deck_section: section
                                });
                            }
                        }
                    });
                };

                processSection(d.main, 'Main');
                processSection(d.extra, 'Extra');
                processSection(d.side, 'Side');

                if (deckCardsPayload.length > 0) {
                    const { error: cardsError } = await supabaseAdmin
                        .from('deck_cards')
                        .insert(deckCardsPayload);
                    
                    if (cardsError) console.error('Error inserting cards:', cardsError);
                    else totalImported++;
                }
            }
        }

        return res.status(200).json({ message: `Sync complete. Imported ${totalImported} decks.` });

    } catch (e) {
        console.error('Fatal error:', e);
        return res.status(500).json({ error: e.message });
    }
}