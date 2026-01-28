import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const HF_API_URL = "https://router.huggingface.co/hf-inference/models/Qwen/Qwen2.5-1.5B-Instruct";

async function generateComment(deckName, hfToken) {
    const prompt = `Você é o MetaBot. Comente sobre o deck de Yu-Gi-Oh "${deckName}". Seja curto e use gírias.`;

    try {
        const response = await fetch(HF_API_URL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } }),
        });
        
        const result = await response.json();
        if (Array.isArray(result) && result[0].generated_text) {
             return result[0].generated_text.trim();
        }
        return null;
    } catch (e) {
        return null;
    }
}

export default async function handler(req, res) {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const HF_TOKEN = process.env.HF_TOKEN;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { data: targetDecks } = await supabaseAdmin.from('decks').select('id, deck_name').eq('is_private', false).neq('user_id', META_BOT_ID).limit(5);

        for (const targetDeck of targetDecks) {
            console.log(`Testando Qwen no deck: ${targetDeck.deck_name}...`);
            const aiComment = await generateComment(targetDeck.deck_name, HF_TOKEN);

            if (aiComment) {
                await supabaseAdmin.from('deck_comments').insert({ deck_id: targetDeck.id, user_id: META_BOT_ID, comment_text: aiComment });
                return res.status(200).json({ success: true, comment: aiComment });
            }
        }
        return res.status(200).json({ message: "IA indisponível no momento." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}