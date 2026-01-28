import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const MDM_API_URL = 'https://www.masterduelmeta.com/api/v1/articles?limit=5';
const HF_API_URL = "https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct";

async function translateArticle(articleData, hfToken) {
    const rawContent = JSON.stringify(articleData).substring(0, 1000); 
    const prompt = `<|system|>Você é o MetaBot. Traduza e resuma a notícia para PT-BR em JSON: { "title_pt": "...", "content_html": "..." }<|end|><|user|>${rawContent}<|end|><|assistant|>`;

    try {
        const response = await fetch(HF_API_URL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500 } }),
        });
        
        const result = await response.json();
        if (Array.isArray(result) && result[0].generated_text) {
             const text = result[0].generated_text.split('<|assistant|>')[1] || result[0].generated_text;
             const jsonMatch = text.match(/\{[\s\S]*\}/);
             if (jsonMatch) return JSON.parse(jsonMatch[0]);
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
        const mdmRes = await fetch(MDM_API_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const articles = await mdmRes.json();
        const targetArticle = articles[0];

        console.log(`Traduzindo notícia: ${targetArticle.title}...`);
        const translatedData = await translateArticle(targetArticle, HF_TOKEN);

        if (translatedData) {
            await supabaseAdmin.from('news_posts').insert({
                user_id: META_BOT_ID,
                title: translatedData.title_pt,
                content: translatedData.content_html,
                image_url: `https://www.masterduelmeta.com${targetArticle.image}`,
                published: true
            });
            return res.status(200).json({ success: true, title: translatedData.title_pt });
        }
        return res.status(200).json({ message: "IA ocupada." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
