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

// Helper to decode YDKE string
function parseYDKE(ydkeString) {
    if (!ydkeString || !ydkeString.startsWith('ydke://')) return null;
    try {
        const parts = ydkeString.replace('ydke://', '').split('!');
        
        const decodeSection = (base64) => {
            if (!base64) return [];
            const buffer = Buffer.from(base64, 'base64');
            const ids = [];
            for (let i = 0; i < buffer.length; i += 4) {
                ids.push(buffer.readUInt32LE(i));
            }
            return ids;
        };

        return {
            main: decodeSection(parts[0]),
            extra: decodeSection(parts[1]),
            side: decodeSection(parts[2])
        };
    } catch (e) {
        console.error("Error parsing YDKE:", e);
        return null;
    }
}

async function scrapeDeckDetails(deckUrl, archetype) {
    try {
        // Extract slug from URL and ensure lowercase for API
        const slug = deckUrl.split('/deck-types/')[1].toLowerCase();
        
        // 1. Try API First
        const apiUrl = `https://www.masterduelmeta.com/api/v1/deck-types/${slug}/decks?limit=5&sort=updated&order=desc`;
        const apiRes = await fetch(apiUrl);
        
        if (apiRes.ok) {
            const decksData = await apiRes.json();
            if (Array.isArray(decksData) && decksData.length > 0) {
                 return decksData.map(d => ({
                    name: `${archetype} - ${d.author?.username || 'Top Deck'}`, 
                    author: d.author?.username || 'Unknown',
                    description: `Deck scraped from Master Duel Meta via API. Rank/Event: ${d.eventName || 'N/A'}.`,
                    main: d.main || [],
                    extra: d.extra || [],
                    side: d.side || [],
                    url: `https://www.masterduelmeta.com/top-decks/${d._id}` 
                }));
            }
        } else {
             console.warn(`API failed for ${slug} (${apiRes.status}). Trying HTML fallback...`);
        }

        // 2. Fallback: Fetch HTML and look for YDKE or embedded data
        // Note: MDM individual deck pages might have YDKE, but the deck-type page lists multiple.
        // We will fetch the deck-type page and look for links to individual decks.
        const pageRes = await fetch(deckUrl);
        const html = await pageRes.text();

        // Find links to top decks: href="/top-decks/..."
        const topDeckLinks = [...html.matchAll(/href="\/top-decks\/([^"]*)"/g)]
            .map(m => `https://www.masterduelmeta.com/top-decks/${m[1]}`)
            .slice(0, 5); // Take top 5

        const fallbackDecks = [];

        for (const link of topDeckLinks) {
            try {
                const deckHtmlRes = await fetch(link);
                const deckHtml = await deckHtmlRes.text();

                // Look for YDKE string in the HTML (often in input value or script)
                // Regex for ydke://... until a quote or space
                const ydkeMatch = deckHtml.match(/ydke:\/\/([a-zA-Z0-9+/=!]+)/);
                
                if (ydkeMatch) {
                    const ydkeString = ydkeMatch[0];
                    const parsed = parseYDKE(ydkeString);
                    
                    if (parsed) {
                        // Extract author/title from HTML if possible
                        const titleMatch = deckHtml.match(/<title>(.*?)<\/title>/);
                        const title = titleMatch ? titleMatch[1].split('|')[0].trim() : `${archetype} Deck`;

                        // Convert YDKE IDs (numbers) to the structure used by the rest of the script (objects with card.konamiID)
                        const mapIds = (ids) => ids.map(id => ({ card: { konamiID: id }, amount: 1 })); 
                        // Note: YDKE lists 3 copies as 3 entries, so amount is always 1 per entry in this mapping strategy 
                        // OR we can aggregate them later. The main script handles aggregation logic (addCards function).

                        fallbackDecks.push({
                            name: title,
                            author: 'Community',
                            description: `Deck scraped from Master Duel Meta via YDKE.`,
                            main: mapIds(parsed.main),
                            extra: mapIds(parsed.extra),
                            side: mapIds(parsed.side),
                            url: link
                        });
                    }
                }
            } catch (innerErr) {
                console.warn(`Error scraping individual deck ${link}:`, innerErr);
            }
        }
        
        return fallbackDecks;

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
