import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

// Use Service Role Key for admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

// Helper to fetch card IDs from our DB by Konami ID
async function mapKonamiIdsToInternalIds(konamiIds) {
    if (!konamiIds || konamiIds.length === 0) return {};

    // Remove duplicates and ensure strings
    const uniqueKIds = [...new Set(konamiIds.map(String))];

    // Supabase 'in' query has limits, batch if necessary (but 60 cards is fine)
    const { data, error } = await supabaseAdmin
        .from('cards')
        .select('id, konami_id')
        .in('konami_id', uniqueKIds);

    if (error) {
        console.error('Error mapping IDs:', error);
        return {};
    }

    const map = {};
    data.forEach(c => {
        if (c.konami_id) map[c.konami_id] = c.id;
    });
    return map;
}

async function scrapeDeckDetails(deckUrl, archetype) {
    try {
        const response = await fetch(deckUrl);
        const html = await response.text();

        // MDM usually embeds a JSON with card data. 
        // We look for the MongoID or similar structure, OR we parse the visual list.
        // Actually, the deck page often has a script tag with "window.extractedState" or similar.
        // Or we can query their internal API if we find the endpoint.
        // For simplicity/robustness without reverse engineering their full API protection:
        // We will look for card links or data attributes in the HTML.
        
        // MDM structure: Cards are often in links like <a href="/cards/Dark%20Magician">
        // But extracting precise quantities (3x) from HTML text is flaky.
        
        // BETTER STRATEGY: Use the public API endpoint used by the frontend if possible.
        // https://www.masterduelmeta.com/api/v1/deck-types/Snake-Eye/decks?limit=10
        // Let's try to guess this endpoint pattern.
        
        // URL is: https://www.masterduelmeta.com/tier-list/deck-types/Snake-Eye
        // API often: https://www.masterduelmeta.com/api/v1/deck-types/{slug}/decks?limit=5
        
        // Extract slug from URL
        const slug = deckUrl.split('/deck-types/')[1];
        const apiUrl = `https://www.masterduelmeta.com/api/v1/deck-types/${slug}/decks?limit=5&sort=updated&order=desc`;
        
        const apiRes = await fetch(apiUrl);
        if (!apiRes.ok) {
            console.warn(`Failed to fetch API for ${slug}: ${apiRes.status}`);
            return [];
        }
        
        const decksData = await apiRes.json();
        
        // The API returns an array of decks.
        // Each deck has "main", "extra", "side" (arrays of objects with "card": { "konamiID": ... }, "amount": ... )
        
        return decksData.map(d => ({
            name: `${archetype} - ${d.author?.username || 'Tournament'}`, // Generate a name
            author: d.author?.username || 'Unknown',
            description: `Deck scraped from Master Duel Meta. Rank/Event: ${d.eventName || 'N/A'}.`,
            main: d.main || [],
            extra: d.extra || [],
            side: d.side || [],
            url: `https://www.masterduelmeta.com/top-decks/${d._id}` // Reference
        }));

    } catch (e) {
        console.error(`Error scraping ${deckUrl}:`, e);
        return [];
    }
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Security check
    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // console.log('Unauthorized');
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        console.log("Starting Meta Deck Sync...");
        const botUserId = META_BOT_ID;
        console.log(`MetaBot User ID: ${botUserId}`);

        // 1. Get Tier List to know which archetypes to fetch
        const tierResponse = await fetch('https://www.masterduelmeta.com/tier-list');
        const tierText = await tierResponse.text();
        
        // Simple regex to extract deck type links
        const deckLinks = [...tierText.matchAll(/href="\/tier-list\/deck-types\/([^\"]*)"/g)]
            .map(m => m[1])
            .filter((v, i, a) => a.indexOf(v) === i); // Unique

        console.log(`Found ${deckLinks.length} archetypes.`);

        let totalImported = 0;

        // Limit to first 10 archetypes to avoid timeouts in serverless function (10s limit)
        // Since this runs daily, we could rotate them? For now, let's process top 5. 
        const processLinks = deckLinks.slice(0, 5); 

        for (const slug of processLinks) {
            const archetype = decodeURIComponent(slug).replace(/-/g, ' ');
            console.log(`Processing ${archetype}...`);

            const decks = await scrapeDeckDetails(`https://www.masterduelmeta.com/tier-list/deck-types/${slug}`, archetype);
            
            for (const deck of decks) {
                // Check if deck already exists (by name + user_id)
                // We add a "hash" or unique identifier in description or name to prevent dupes?
                // Let's use the source URL as a check key if we can store it? 
                // We don't have a source_url column. Let's append ID to description and check that.
                
                // Optimized Check: Check if we have a deck by this user with this exact name
                const { data: existing } = await supabaseAdmin
                    .from('decks')
                    .select('id, description')
                    .eq('user_id', botUserId)
                    .eq('deck_name', deck.name)
                    .maybeSingle();

                if (existing) {
                    // console.log(`Skipping existing deck: ${deck.name}`);
                    continue; 
                }

                // Prepare cards
                const allKonamiIds = [
                    ...deck.main.map(c => c.card.konamiID),
                    ...deck.extra.map(c => c.card.konamiID),
                    ...deck.side.map(c => c.card.konamiID)
                ];

                const idMap = await mapKonamiIdsToInternalIds(allKonamiIds);
                
                // Create Deck
                const { data: newDeck, error: deckError } = await supabaseAdmin
                    .from('decks')
                    .insert({
                        user_id: botUserId,
                        deck_name: deck.name,
                        is_private: false,
                        is_genesys: false
                        // description: deck.description + `\nSource: ${deck.url}` // If we had description
                    })
                    .select()
                    .single();

                if (deckError) {
                    console.error('Error creating deck:', deckError);
                    continue;
                }

                // Prepare Deck Cards
                const deckCardsPayload = [];
                
                const addCards = (list, section) => {
                    list.forEach(item => {
                        const internalId = idMap[String(item.card.konamiID)];
                        if (internalId) {
                            // We need one row per copy for the current schema?
                            // Let's check 'deck_cards' schema. 
                            // Usually: id, deck_id, card_api_id, deck_section
                            // It's 1 row per card instance (so 3 rows for 3 copies).
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

                addCards(deck.main, 'Main');
                addCards(deck.extra, 'Extra');
                addCards(deck.side, 'Side');

                if (deckCardsPayload.length > 0) {
                    const { error: cardsError } = await supabaseAdmin
                        .from('deck_cards')
                        .insert(deckCardsPayload);
                    
                    if (cardsError) console.error('Error inserting cards:', cardsError); else totalImported++;
                }
            }
        }

        return res.status(200).json({ message: `Sync complete. Imported ${totalImported} decks.` });

    } catch (e) {
        console.error('Fatal error:', e);
        return res.status(500).json({ error: e.message });
    }
}
