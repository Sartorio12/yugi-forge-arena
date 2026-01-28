import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const MDM_API_URL = 'https://www.masterduelmeta.com/api/v1/articles?limit=5';
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

async function translateArticle(articleData, hfToken) {
    // Reduzir tamanho para não estourar contexto
    const rawContent = JSON.stringify(articleData).substring(0, 4000); 

    const prompt = `<s>[INST] Você é o MetaBot, Editor de Yu-Gi-Oh.
Tarefa: Traduza e resuma esta notícia para Português Brasil. 
Formato Saída: APENAS JSON válido neste formato: { "title_pt": "...", "content_html": "<p>...</p>" }.

Notícia Original:
${rawContent} [/INST]`;

    try {
        const response = await fetch(HF_API_URL, {
            headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
            method: "POST",
            body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1000, temperature: 0.5, return_full_text: false } }),
        });
        
        const result = await response.json();
        if (Array.isArray(result) && result[0].generated_text) {
             // Tentar extrair JSON do texto gerado (às vezes a IA fala antes)
             const text = result[0].generated_text;
             const jsonMatch = text.match(/\{[\s\S]*\}/);
             if (jsonMatch) return JSON.parse(jsonMatch[0]);
             return null;
        }
        return null;
    } catch (e) {
        console.error("Erro HF News:", e);
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
        // ... (Mesma lógica de busca do MDM)
        const mdmRes = await fetch(MDM_API_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0' } });
        if (!mdmRes.ok) throw new Error(`Erro MDM: ${mdmRes.status}`);
        
        const articles = await mdmRes.json();
        if (!articles || articles.length === 0) return res.status(200).json({ message: "Sem notícias." });

        let targetArticle = null;
        // Pega a primeira que não tenha sido postada hoje
        for (const article of articles) {
             const { data: lastPost } = await supabaseAdmin.from('news_posts').select('created_at').eq('user_id', META_BOT_ID).order('created_at', { ascending: false }).limit(1).maybeSingle();
             const lastPostDate = lastPost ? new Date(lastPost.created_at) : new Date(0);
             if ((new Date() - lastPostDate) / (1000 * 60 * 60) < 20) return res.status(200).json({ message: "Jornalista em intervalo." });
             targetArticle = article;
             break;
        }

        if (!targetArticle) return res.status(200).json({ message: "Sem pauta." });

        console.log(`HF Traduzindo: ${targetArticle.title}...`);
        const translatedData = await translateArticle(targetArticle, HF_TOKEN);
        if (!translatedData) throw new Error("Falha na IA HuggingFace.");

        const imageBaseUrl = "https://www.masterduelmeta.com";
        let finalImageUrl = targetArticle.image?.startsWith('http') ? targetArticle.image : `${imageBaseUrl}${targetArticle.image}`;

        await supabaseAdmin.from('news_posts').insert({
            user_id: META_BOT_ID,
            title: translatedData.title_pt,
            content: translatedData.content_html,
            image_url: finalImageUrl,
            published: true
        });

        return res.status(200).json({ success: true, title: translatedData.title_pt });

    } catch (error) {
        console.error("Erro:", error);
        return res.status(500).json({ error: error.message });
    }
}