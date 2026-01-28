import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// CONFIGURAÇÃO
// --------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ID do Usuário "MetaBot"
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const MDM_API_URL = 'https://www.masterduelmeta.com/api/v1/articles?limit=5';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --------------------------------------------------------------------------
// LÓGICA DO JORNALISTA (AI)
// --------------------------------------------------------------------------

async function translateArticle(articleData, genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Preparar o conteúdo para a IA (limitando tamanho para não estourar tokens)
    const rawContent = JSON.stringify(articleData).substring(0, 8000);

    const prompt = `
    ATUE COMO: MetaBot, Editor Chefe de um portal de notícias de Yu-Gi-Oh! profissional.
    
    TAREFA:
    1. Leia os dados brutos deste artigo (título e conteúdo) vindo do Master Duel Meta.
    2. Traduza e REESCREVA a notícia para Português (Brasil).
    3. Mantenha um tom jornalístico, informativo e empolgante.
    4. Formate o corpo do texto em HTML limpo (use <p>, <b>, <ul>, <li>, <h2>). NÃO use markdown, apenas HTML.
    
    DADOS DO ARTIGO (JSON):
    ${rawContent}
    
    SAÍDA ESPERADA (JSON VÁLIDO):
    {
        "title_pt": "Título Chamativo em PT-BR",
        "summary_pt": "Resumo curto de 1 frase para o card da notícia",
        "content_html": "<p>O corpo da notícia...</p>"
    }
    
    IMPORTANTE:
    - Se o artigo for sobre "Tier List Update", o título deve ser algo como "Atualização da Tier List: [Principais Mudanças]".
    - Se for "Leaks", use "Vazamentos: [O que vazou]".
    - Responda APENAS o JSON.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim(); // Limpar code blocks
        return JSON.parse(text);
    } catch (e) {
        console.error("Erro na tradução do Gemini:", e);
        // Fallback simples se o JSON falhar
        return null;
    }
}

// --------------------------------------------------------------------------
// HANDLER PRINCIPAL
// --------------------------------------------------------------------------

export default async function handler(req, res) {
    // 1. Segurança
    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY ausente.' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        console.log("MetaBot News: Buscando pautas no Master Duel Meta...");

        // 2. Buscar Notícias na Fonte
        const mdmRes = await fetch(MDM_API_URL);
        if (!mdmRes.ok) throw new Error(`Erro ao acessar MDM: ${mdmRes.status}`);
        
        const articles = await mdmRes.json();
        if (!articles || articles.length === 0) return res.status(200).json({ message: "Nenhuma notícia encontrada." });

        // Vamos tentar processar a notícia mais recente
        // Se ela já existir, tentamos a segunda, etc.
        let targetArticle = null;
        let isDuplicate = true;

        for (const article of articles) {
            // Verifica duplicidade no banco (por data aproximada ou título original se tivéssemos)
            // Como não temos ID original, vamos checar se existe notícia criada nas últimas 48h
            // que tenha um título "parecido" ou se já postamos hoje.
            
            // Estratégia simples: Verificar se existe alguma notícia criada nas últimas 24h
            // Se existir, assume que o bot já trabalhou hoje e para (para evitar spam).
            // A menos que queira postar múltiplas. Vamos postar APENAS SE a mais recente do banco for antiga.
            
            const { data: lastPost } = await supabaseAdmin
                .from('news_posts')
                .select('created_at, title')
                .eq('user_id', META_BOT_ID)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            // Se a última notícia do bot tem menos de 20h, assumimos que já cobrimos a pauta do dia.
            const lastPostDate = lastPost ? new Date(lastPost.created_at) : new Date(0);
            const hoursSinceLastPost = (new Date() - lastPostDate) / (1000 * 60 * 60);

            if (hoursSinceLastPost < 20) {
                console.log("MetaBot já postou uma notícia nas últimas 20h. Descansando.");
                return res.status(200).json({ message: "Jornalista em intervalo (Notícia recente já existe)." });
            }
            
            targetArticle = article;
            isDuplicate = false;
            break; // Achamos uma pauta
        }

        if (isDuplicate || !targetArticle) {
            return res.status(200).json({ message: "Nenhuma pauta nova válida." });
        }

        console.log(`Pauta encontrada: "${targetArticle.title}". Iniciando redação...`);

        // 3. Tradução e Adaptação
        const translatedData = await translateArticle(targetArticle, genAI);

        if (!translatedData) {
            throw new Error("Falha ao gerar o artigo com IA.");
        }

        // 4. Preparar Imagem
        // MDM images usually look like: /img/articles/xyz.png. Need base URL.
        const imageBaseUrl = "https://www.masterduelmeta.com"; // ou m2.masterduelmeta.com
        let finalImageUrl = null;

        if (targetArticle.image) {
            if (targetArticle.image.startsWith('http')) {
                finalImageUrl = targetArticle.image;
            } else {
                finalImageUrl = `${imageBaseUrl}${targetArticle.image}`;
            }
        }

        // 5. Publicar
        const { error: insertError } = await supabaseAdmin
            .from('news_posts')
            .insert({
                user_id: META_BOT_ID,
                title: translatedData.title_pt,
                content: translatedData.content_html, // HTML formatado
                image_url: finalImageUrl,
                published: true,
                // summary: translatedData.summary_pt // Se tiver coluna summary
            });

        if (insertError) throw insertError;

        return res.status(200).json({
            success: true,
            original_title: targetArticle.title,
            new_title: translatedData.title_pt
        });

    } catch (error) {
        console.error("Erro no MetaBot News:", error);
        return res.status(500).json({ error: error.message });
    }
}
