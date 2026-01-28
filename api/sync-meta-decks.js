import { createClient } from '@supabase/supabase-js';
import { translate } from 'google-translate-api-x';

// Initialize Supabase client
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://mggwlfbajeqbdgkflmqi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Supabase URL or Service Role Key is not defined.');
}

// Use Service Role Key for admin privileges
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';
const MDM_BASE_URL = 'https://www.masterduelmeta.com';

// ---------------------------------------------------------
// HELPER FUNCTIONS (Decks)
// ---------------------------------------------------------

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

// ---------------------------------------------------------
// HELPER FUNCTIONS (News)
// ---------------------------------------------------------

const cardIdCache = new Map();

async function getCardId(name) {
    if (cardIdCache.has(name)) return cardIdCache.get(name);
    // Reuse the map logic implicitly or just query simple
    const { data } = await supabaseAdmin.from('cards').select('id').eq('name', name).maybeSingle();
    if (data) {
        cardIdCache.set(name, data.id);
        return data.id;
    }
    return null;
}

async function createDeckFromContainer(deckProps, articleTitle, index) {
    const deckName = `${articleTitle} - Deck ${index + 1}`;
    
    // Create Deck
    const { data: deck, error: createError } = await supabaseAdmin
        .from('decks')
        .insert({
            user_id: META_BOT_ID,
            deck_name: deckName,
            is_private: false,
            is_genesys: false
        })
        .select()
        .single();

    if (createError) {
        console.error('Error creating deck:', createError);
        return null;
    }

    // Add Cards
    const deckCardsPayload = [];
    const processSection = async (list, section) => {
        if (!list) return;
        for (const item of list) {
            const cardName = item.card.name;
            const amount = item.amount;
            const cardId = await getCardId(cardName);
            
            if (cardId) {
                for (let i = 0; i < amount; i++) {
                    deckCardsPayload.push({
                        deck_id: deck.id,
                        card_api_id: cardId,
                        deck_section: section
                    });
                }
            }
        }
    };

    await processSection(deckProps.main, 'Main');
    await processSection(deckProps.extra, 'Extra');
    await processSection(deckProps.side, 'Side');

    if (deckCardsPayload.length > 0) {
        const { error: cardsError } = await supabaseAdmin.from('deck_cards').insert(deckCardsPayload);
        if (cardsError) console.error('Error adding cards to deck:', cardsError);
    }

    return deck.id;
}

async function translateText(text) {
    if (!text || text.trim().length === 0) return text;
    try {
        const res = await translate(text, { to: 'pt', forceBatch: false });
        return res.text;
    } catch (e) {
        console.warn('Translation failed, using original:', e.message);
        return text;
    }
}

async function parseNode(node, customComponents, createdDecks, articleTitle) {
    if (node.type === 'text') {
        return await translateText(node.content);
    }

    if (node.type === 'tag') {
        const tagName = node.name;
        
        // Handling component placeholders
        if (tagName === 'component') {
            const compId = node.attrs.id;
            const comp = customComponents[compId];
            
            if (comp) {
                if (comp.type === 'DeckContainer') {
                    // Create the deck
                    const deckId = await createDeckFromContainer(comp.props, articleTitle, createdDecks.length); 
                    if (deckId) {
                        createdDecks.push(deckId);
                        return `<div class="bg-secondary/20 p-4 rounded-lg my-4 text-center border border-border">
                                    <strong>Deck Importado #${createdDecks.length}</strong><br/>
                                    <span class="text-xs text-muted-foreground">(Veja o deck completo anexado abaixo)</span>
                                </div>`;
                    }
                } else if (comp.type === 'YouTubeVideo') {
                    return `<div class="aspect-video my-4"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${comp.props.videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
                } else if (comp.type === 'CardLink') {
                     return `<strong>${comp.props.name}</strong>`;
                }
            }
            return '';
        }

        // Standard HTML tags
        let innerHtml = '';
        if (node.children) {
            for (const child of node.children) {
                innerHtml += await parseNode(child, customComponents, createdDecks, articleTitle);
            }
        }

        // Handle Images
        if (tagName === 'img') {
            const src = node.attrs.src.startsWith('http') ? node.attrs.src : `${MDM_BASE_URL}${node.attrs.src}`;
            return `<img src="${src}" alt="${node.attrs.alt || 'image'}" class="rounded-lg my-4 max-w-full h-auto" />`;
        }

        if (tagName === 'a') {
             return `<a href="${node.attrs.href}" target="_blank" class="text-primary hover:underline">${innerHtml}</a>`;
        }

        return `<${tagName}>${innerHtml}</${tagName}>`;
    }
    
    return '';
}

async function runNewsSync() {
    console.log("Starting News Sync...");
    try {
        const response = await fetch(`${MDM_BASE_URL}/api/v1/articles?limit=20&sort=-date`); // Limit 20 to catch up
        if (!response.ok) return { imported: 0, error: response.statusText };
        
        let articles = await response.json();
        if (!Array.isArray(articles)) articles = [articles];
        
        if (articles.length === 0) return { imported: 0 };

        let importedCount = 0;

        // Process oldest first to maintain order if bulk
        const reversed = articles.reverse();

        for (const article of reversed) {
             // Check Duplicate (Loose check by date + title check implicit if needed, but date is safer for now)
            const { data: existing } = await supabaseAdmin
                .from('news_posts')
                .select('id')
                .eq('created_at', article.date) 
                .maybeSingle();

            if (existing) continue;

            console.log(`Importing News: ${article.title}`);
            const translatedTitle = await translateText(article.title);
            const createdDeckIds = [];
            let htmlContent = '';
            
            if (article.parsedMarkdown && article.parsedMarkdown.htmlTree) {
                for (const node of article.parsedMarkdown.htmlTree) {
                    htmlContent += await parseNode(node, article.parsedMarkdown.customComponents || {}, createdDeckIds, translatedTitle);
                }
            } else {
                 htmlContent = `<p>${await translateText(article.description)}</p>`;
            }

            htmlContent += `<p class="text-xs text-muted-foreground mt-4">Fonte Original: <a href="${MDM_BASE_URL}${article.url}" target="_blank">${MDM_BASE_URL}</a> (Traduzido Automaticamente)</p>`;

            const { data: newPost, error: insertError } = await supabaseAdmin
                .from('news_posts')
                .insert({
                    author_id: META_BOT_ID,
                    title: translatedTitle,
                    content: htmlContent,
                    banner_url: article.image ? `${MDM_BASE_URL}${article.image}` : null,
                    created_at: article.date
                })
                .select()
                .single();

            if (!insertError && newPost) {
                importedCount++;
                if (createdDeckIds.length > 0) {
                    const pivotData = createdDeckIds.map((deckId, index) => ({
                        post_id: newPost.id,
                        deck_id: deckId,
                        placement: `Deck ${index + 1}`
                    }));
                    await supabaseAdmin.from('news_post_decks').insert(pivotData);
                }
            }
        }
        return { imported: importedCount };
    } catch (e) {
        console.error("News Sync Error:", e);
        return { imported: 0, error: e.message };
    }
}


// ---------------------------------------------------------
// MAIN HANDLER
// ---------------------------------------------------------

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

        // --- PART 1: DECKS ---
        console.log("Fetching all deck types for matching...");
        const allTypesRes = await fetch('https://www.masterduelmeta.com/api/v1/deck-types?limit=1000');
        if (!allTypesRes.ok) throw new Error(`Failed to fetch deck types: ${allTypesRes.status}`);
        const allDeckTypes = await allTypesRes.json();
        console.log(`Loaded ${allDeckTypes.length} deck types.`);

        const tierResponse = await fetch('https://www.masterduelmeta.com/tier-list');
        const tierText = await tierResponse.text();
        const deckLinks = [...tierText.matchAll(/href="\/tier-list\/deck-types\/([^"]*)"/g)]
            .map(m => m[1])
            .filter((v, i, a) => a.indexOf(v) === i); 

        console.log(`Found ${deckLinks.length} archetypes on Tier List.`);

        let totalImportedDecks = 0;
        const processLinks = deckLinks.slice(0, 8); 

        for (const slug of processLinks) {
            const archetypeRaw = decodeURIComponent(slug).replace(/-/g, ' ');
            const match = allDeckTypes.find(t => t.name.toLowerCase() === archetypeRaw.toLowerCase()) || 
                          allDeckTypes.find(t => t.name.toLowerCase().includes(archetypeRaw.toLowerCase()));

            if (!match) continue;

            const deckTypeId = match._id;
            const archetype = match.name;
            const decksApiUrl = `https://www.masterduelmeta.com/api/v1/top-decks?deckType=${deckTypeId}&limit=5&sort=-created`;
            const decksRes = await fetch(decksApiUrl);
            if (!decksRes.ok) continue;

            const decksData = await decksRes.json();
            if (!Array.isArray(decksData) || decksData.length === 0) continue;

            for (const d of decksData) {
                const authorName = d.author?.username || 'Unknown';
                const deckName = `${archetype} - ${authorName}`;
                
                const { data: existing } = await supabaseAdmin
                    .from('decks')
                    .select('id')
                    .eq('user_id', botUserId)
                    .eq('deck_name', deckName)
                    .maybeSingle();

                if (existing) continue;

                const allCardNames = [
                    ...d.main.map(c => c.card.name),
                    ...d.extra.map(c => c.card.name),
                    ...d.side.map(c => c.card.name)
                ];

                const nameToIdMap = await mapCardNamesToInternalIds(allCardNames);

                const { data: newDeck, error: createError } = await supabaseAdmin
                    .from('decks')
                    .insert({
                        user_id: botUserId,
                        deck_name: deckName,
                        is_private: false,
                        is_genesys: false,
                    })
                    .select()
                    .single();

                if (createError) continue;

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
                    const { error: cardsError } = await supabaseAdmin.from('deck_cards').insert(deckCardsPayload);
                    if (!cardsError) totalImportedDecks++;
                }
            }
        }

        // --- PART 2: NEWS ---
        // News sync disabled as per user request
        // const newsResult = await runNewsSync();
        const newsResult = { imported: 0 };

        return res.status(200).json({
            message: `Sync complete.`, 
            stats: {
                decks: totalImportedDecks,
                news: newsResult.imported,
                newsError: newsResult.error
            }
        });

    } catch (e) {
        console.error('Fatal error:', e);
        return res.status(500).json({ error: e.message });
    }
}
