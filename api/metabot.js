import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';
const HF_NEWS_MODEL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";
const HF_SOCIAL_MODEL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-1.5B-Instruct";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_TOKEN = process.env.HF_TOKEN;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- HELPERS ---
async function mapCardNamesToInternalIds(cardNames) {
    if (!cardNames || cardNames.length === 0) return {};
    const uniqueNames = [...new Set(cardNames)];
    const { data } = await supabaseAdmin.from('cards').select('id, name').in('name', uniqueNames);
    const map = {};
    data?.forEach(c => map[c.name] = c.id);
    return map;
}

async function translateArticle(articleData, hfToken) {
    const rawContent = JSON.stringify(articleData).substring(0, 1500);
    const prompt = `<s>[INST] Você é o MetaBot, Especialista e Comentarista de Yu-Gi-Oh!.
Escreva um artigo DETALHADO sobre a notícia abaixo para o seu blog.
FORMATO SAÍDA: APENAS JSON: { "title_pt": "...", "content_html": "..." }.
DADOS ORIGINAIS: ${rawContent} [/INST]`;

    try {
        const res = await fetch(HF_NEWS_MODEL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1000, temperature: 0.6 } }),
        });
        const result = await res.json();
        if (Array.isArray(result) && result[0].generated_text) {
            const text = result[0].generated_text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
        }
    } catch (e) { console.error(e); }
    return null;
}

async function generateComment(deckName, hfToken) {
    const prompt = `Você é o MetaBot. Comente sobre o deck de Yu-Gi-Oh "${deckName}". Seja curto e use gírias.`;
    try {
        const res = await fetch(HF_SOCIAL_MODEL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
        });
        const result = await res.json();
        if (Array.isArray(result) && result[0].generated_text) return result[0].generated_text.trim();
    } catch (e) { }
    return null;
}

// --- MAIN HANDLER ---
export default async function handler(req, res) {
    const { action } = req.query;
    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // Optional security
    }

    try {
        // ACTION: SYNC DECKS
        if (action === 'sync-decks') {
            const allTypesRes = await fetch('https://www.masterduelmeta.com/api/v1/deck-types?limit=1000');
            const allDeckTypes = await allTypesRes.json();
            const tierResponse = await fetch('https://www.masterduelmeta.com/tier-list');
            const tierText = await tierResponse.text();
            const deckLinks = [...tierText.matchAll(/href="\/tier-list\/deck-types\/([^"]*)"/g)].map(m => m[1]).filter((v, i, a) => a.indexOf(v) === i);

            let totalImported = 0;
            for (const slug of deckLinks.slice(0, 5)) {
                const archetypeRaw = decodeURIComponent(slug).replace(/-/g, ' ');
                const match = allDeckTypes.find(t => t.name.toLowerCase().includes(archetypeRaw.toLowerCase()));
                if (!match) continue;

                const decksRes = await fetch(`https://www.masterduelmeta.com/api/v1/top-decks?deckType=${match._id}&limit=3`);
                const decksData = await decksRes.json();
                for (const d of (decksData || [])) {
                    const deckName = `${match.name} - ${d.author?.username || 'Unknown'}`;
                    const { data: existing } = await supabaseAdmin.from('decks').select('id').eq('user_id', META_BOT_ID).eq('deck_name', deckName).maybeSingle();
                    if (existing) continue;

                    const allCardNames = [...d.main.map(c => c.card.name), ...d.extra.map(c => c.card.name), ...d.side.map(c => c.card.name)];
                    const nameToIdMap = await mapCardNamesToInternalIds(allCardNames);
                    const { data: newDeck } = await supabaseAdmin.from('decks').insert({ user_id: META_BOT_ID, deck_name: deckName }).select().single();
                    if (!newDeck) continue;

                    const deckCardsPayload = [];
                    const addSection = (list, section) => list.forEach(item => {
                        const id = nameToIdMap[item.card.name];
                        if (id) for (let i = 0; i < item.amount; i++) deckCardsPayload.push({ deck_id: newDeck.id, card_api_id: id, deck_section: section });
                    });
                    addSection(d.main, 'Main'); addSection(d.extra, 'Extra'); addSection(d.side, 'Side');
                    if (deckCardsPayload.length > 0) await supabaseAdmin.from('deck_cards').insert(deckCardsPayload);
                    totalImported++;
                }
            }
            return res.status(200).json({ imported: totalImported });
        }

        // ACTION: NEWS
        if (action === 'news') {
            const mdmRes = await fetch('https://www.masterduelmeta.com/api/v1/articles?limit=5');
            const articles = await mdmRes.json();
            for (const article of (articles || [])) {
                const { data: lastPost } = await supabaseAdmin.from('news_posts').select('created_at').eq('author_id', META_BOT_ID).order('created_at', { ascending: false }).limit(1).maybeSingle();
                if (lastPost && (new Date() - new Date(lastPost.created_at)) / (1000 * 60 * 60) < 20) break;

                const translated = await translateArticle(article, HF_TOKEN);
                if (translated) {
                    const imageBase = "https://www.masterduelmeta.com";
                    let finalImg = article.image?.startsWith('http') ? article.image : `${imageBase}${article.image}`;
                    await supabaseAdmin.from('news_posts').insert({ author_id: META_BOT_ID, title: translated.title_pt, content: translated.content_html, banner_url: finalImg });
                    return res.status(200).json({ news: translated.title_pt });
                }
            }
            return res.status(200).json({ message: "No news posted" });
        }

        // ACTION: SOCIAL
        if (action === 'social') {
            const { data: targetDecks } = await supabaseAdmin.from('decks').select('id, deck_name').eq('is_private', false).neq('user_id', META_BOT_ID).limit(3);
            for (const targetDeck of (targetDecks || [])) {
                const aiComment = await generateComment(targetDeck.deck_name, HF_TOKEN);
                if (aiComment) {
                    await supabaseAdmin.from('deck_comments').insert({ deck_id: targetDeck.id, user_id: META_BOT_ID, comment_text: aiComment });
                    return res.status(200).json({ comment: aiComment });
                }
            }
            return res.status(200).json({ message: "No social activity" });
        }

        return res.status(400).json({ error: "Invalid action" });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
