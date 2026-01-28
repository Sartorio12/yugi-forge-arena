import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// CONFIGURAÇÃO
// --------------------------------------------------------------------------

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const MDM_API_URL = 'https://www.masterduelmeta.com/api/v1/articles?limit=5';

// --------------------------------------------------------------------------
// LÓGICA DO JORNALISTA (AI)
// --------------------------------------------------------------------------

async function translateArticle(articleData, genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const rawContent = JSON.stringify(articleData).substring(0, 8000);

    const prompt = `
    ATUE COMO: MetaBot, Editor Chefe de um portal de notícias de Yu-Gi-Oh!.
    TAREFA: Traduzir e REESCREVER a notícia para Português (Brasil).
    FORMATO: HTML puro.
    
    DADOS: ${rawContent}
    
    SAÍDA (JSON): { "title_pt": "...", "content_html": "..." }
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("Erro no Gemini:", e);
        return null;
    }
}

// --------------------------------------------------------------------------
// HANDLER PRINCIPAL
// --------------------------------------------------------------------------

export default async function handler(req, res) {
    // 1. Carregar Variáveis DENTRO do handler
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 2. Verificação de Segurança
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: "CONFIG_ERROR: SUPABASE_SERVICE_ROLE_KEY ausente na Vercel." });
    }
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "CONFIG_ERROR: GEMINI_API_KEY ausente." });
    }

    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    // Inicialização Segura
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        console.log("MetaBot News: Buscando pautas...");
        const mdmRes = await fetch(MDM_API_URL);
        if (!mdmRes.ok) throw new Error(`Erro MDM: ${mdmRes.status}`);
        
        const articles = await mdmRes.json();
        if (!articles || articles.length === 0) return res.status(200).json({ message: "Sem notícias." });

        let targetArticle = null;
        let isDuplicate = true;

        for (const article of articles) {
            const { data: lastPost } = await supabaseAdmin
                .from('news_posts')
                .select('created_at')
                .eq('user_id', META_BOT_ID)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            const lastPostDate = lastPost ? new Date(lastPost.created_at) : new Date(0);
            const hoursSinceLastPost = (new Date() - lastPostDate) / (1000 * 60 * 60);

            if (hoursSinceLastPost < 20) {
                return res.status(200).json({ message: "Jornalista em intervalo (Notícia recente já existe)." });
            }
            
            targetArticle = article;
            isDuplicate = false;
            break;
        }

        if (isDuplicate || !targetArticle) return res.status(200).json({ message: "Sem pauta nova." });

        const translatedData = await translateArticle(targetArticle, genAI);
        if (!translatedData) throw new Error("Falha na IA.");

        const imageBaseUrl = "https://www.masterduelmeta.com";
        let finalImageUrl = targetArticle.image?.startsWith('http') ? targetArticle.image : `${imageBaseUrl}${targetArticle.image}`;

        const { error: insertError } = await supabaseAdmin
            .from('news_posts')
            .insert({
                user_id: META_BOT_ID,
                title: translatedData.title_pt,
                content: translatedData.content_html,
                image_url: finalImageUrl,
                published: true
            });

        if (insertError) throw insertError;

        return res.status(200).json({ success: true, title: translatedData.title_pt });

    } catch (error) {
        console.error("Erro no MetaBot News:", error);
        return res.status(500).json({ error: error.message });
    }
}