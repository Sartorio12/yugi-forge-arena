import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

async function generateComment(deckName, cardList, tierListSummary, hfToken) {
    const prompt = `<s>[INST] Você é o MetaBot, um especialista sarcástico em Yu-Gi-Oh.
Contexto do Meta: ${tierListSummary}.
Deck do Usuário: "${deckName}" com as cartas: ${cardList.join(', ')}.

Escreva um comentário curto (max 280 chars) sobre esse deck. Use gírias de Yu-Gi-Oh (brickar, staple, tier 0). Seja engraçado ou crítico. NÃO use aspas. [/INST]`;

    try {
        const response = await fetch(HF_API_URL, {
            headers: {
                Authorization: `Bearer ${hfToken}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 150, temperature: 0.8, return_full_text: false } }),
        });
        
        const result = await response.json();
        // HuggingFace retorna array [{ generated_text: "..." }]
        if (Array.isArray(result) && result[0].generated_text) {
             return result[0].generated_text.trim().replace(/"/g, '');
        }
        return null;
    } catch (e) {
        console.error("Erro HuggingFace:", e);
        return null;
    }
}

export default async function handler(req, res) {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const HF_TOKEN = process.env.HF_TOKEN;

    if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "CONFIG_ERROR: SUPABASE_SERVICE_ROLE_KEY ausente." });
    if (!HF_TOKEN) return res.status(500).json({ error: "CONFIG_ERROR: HF_TOKEN ausente." });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: tierData } = await supabaseAdmin
            .from('tier_list')
            .select('deck_name, tier')
            .order('tier', { ascending: true })
            .limit(10);
        
        const tierListSummary = tierData 
            ? tierData.map(t => `- ${t.deck_name} (Tier ${t.tier})`).join('\n')
            : "Contexto Indisponível";

        // Busca decks recentes
        const { data: targetDecks } = await supabaseAdmin
            .from('decks')
            .select('id, deck_name, user_id')
            .eq('is_private', false)
            .neq('user_id', META_BOT_ID)
            .order('created_at', { ascending: false })
            .limit(50); // Aumentei limite

        const shuffledDecks = targetDecks?.sort(() => 0.5 - Math.random()) || [];

        for (const targetDeck of shuffledDecks) {
            // Check já comentado
            const { data: existing } = await supabaseAdmin.from('deck_comments').select('id').eq('deck_id', targetDeck.id).eq('user_id', META_BOT_ID).maybeSingle();
            if (existing) continue;

            // Check cartas
            const { data: deckCards } = await supabaseAdmin.from('deck_cards').select('cards(name)').eq('deck_id', targetDeck.id);
            if (!deckCards || deckCards.length < 5) continue;

            const cardList = deckCards.map(d => d.cards?.name).filter(Boolean);

            console.log(`HF Analisando: ${targetDeck.deck_name}...`);
            const aiComment = await generateComment(targetDeck.deck_name, cardList, tierListSummary, HF_TOKEN);

            if (aiComment) {
                await supabaseAdmin.from('deck_comments').insert({ deck_id: targetDeck.id, user_id: META_BOT_ID, content: aiComment });
                await supabaseAdmin.from('deck_likes').insert({ deck_id: targetDeck.id, user_id: META_BOT_ID }).ignore();
                
                return res.status(200).json({ success: true, deck: targetDeck.deck_name, comment: aiComment });
            }
        }

        return res.status(200).json({ message: "Nenhum deck novo válido encontrado." });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}