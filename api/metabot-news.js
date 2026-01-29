import { createClient } from '@supabase/supabase-js';

const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 
const MDM_API_URL = 'https://www.masterduelmeta.com/api/v1/articles?limit=10'; // Buscando mais para poder filtrar
const HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

async function translateArticle(articleData, hfToken, retries = 3) {
    const rawContent = JSON.stringify(articleData).substring(0, 1500); 

    // PROMPT REFINADO: DETALHADO E ENXUTO
    const prompt = `<s>[INST] Você é o MetaBot, Especialista e Comentarista de Yu-Gi-Oh!.
TAREFA: Escreva um artigo DETALHADO sobre a notícia abaixo para o seu blog.
REQUISITOS DE CONTEÚDO:
- Explique a estratégia central (Intro).
- Detalhe as cartas principais e por que são boas.
- Mencione possíveis combos ou interações.
- Aponte os pontos fracos ou como jogar contra.
- Use gírias (staple, engine, brick, tier).

ESTILO VISUAL (OBRIGATÓRIO):
- Texto padrão: <p style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0.8rem;">
- Títulos: <h2 style="color: #60a5fa; font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 1px solid #1e293b;">
- Listas: <ul style="color: #94a3b8; font-size: 0.9rem; list-style-type: square; padding-left: 15px;">
- Negrito: <b style="color: #f472b6;">

FORMATO SAÍDA: APENAS JSON: { "title_pt": "...", "content_html": "..." }.

DADOS ORIGINAIS:
${rawContent} [/INST]`;

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Tentativa IA ${i + 1}/${retries}...`);
            const response = await fetch(HF_API_URL, {
                headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 1000, temperature: 0.6, return_full_text: false } }),
            });
            
            const result = await response.json();
            
            if (result.error && result.error.includes("loading")) {
                console.log("Modelo carregando... esperando 10s");
                await new Promise(r => setTimeout(r, 10000));
                continue;
            }

            if (Array.isArray(result) && result[0].generated_text) {
                 const text = result[0].generated_text;
                 const jsonMatch = text.match(/\{[\s\S]*\}/);
                 if (jsonMatch) return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.error(`Erro tentativa ${i + 1}:`, e.message);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

export default async function handler(req, res) {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const HF_TOKEN = process.env.HF_TOKEN;

    if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "CONFIG_ERROR: SUPABASE_SERVICE_ROLE_KEY ausente." });
    if (!HF_TOKEN) return res.status(500).json({ error: "CONFIG_ERROR: HF_TOKEN ausente." });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const mdmRes = await fetch(MDM_API_URL, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0' } });
        if (!mdmRes.ok) throw new Error(`Erro MDM: ${mdmRes.status}`);
        
        const articles = await mdmRes.json();
        if (!articles || articles.length === 0) return res.status(200).json({ message: "Sem notícias." });

        let targetArticle = null;
        
        // FILTRO DE CATEGORIAS
        const ALLOWED_TAGS = ["OCG", "TCG", "NEWS", "EVENT", "GUIDE", "MASTER DUEL", "LEAKS"];
        
        for (const article of articles) {
             // Verificar Tags (se existirem) ou Título
             const tags = article.tags || [];
             const titleUpper = article.title.toUpperCase();
             const category = article.category || "";

             // Verifica se tem alguma tag permitida ou se o título/categoria contém as palavras chaves
             const isAllowed = tags.some(t => ALLOWED_TAGS.includes(t.toUpperCase())) || 
                               ALLOWED_TAGS.some(tag => titleUpper.includes(tag)) ||
                               ALLOWED_TAGS.includes(category.toUpperCase());

             if (!isAllowed) {
                 console.log(`Pulando artigo fora do escopo: ${article.title}`);
                 continue;
             }

             const { data: lastPost } = await supabaseAdmin.from('news_posts').select('created_at').eq('user_id', META_BOT_ID).order('created_at', { ascending: false }).limit(1).maybeSingle();
             const lastPostDate = lastPost ? new Date(lastPost.created_at) : new Date(0);
             
             // TRAVA DE TEMPO (Reativada para produção - 20h)
             if ((new Date() - lastPostDate) / (1000 * 60 * 60) < 20) {
                 return res.status(200).json({ message: "Jornalista em intervalo (já postou hoje)." });
             }
             
             targetArticle = article;
             break;
        }

        if (!targetArticle) return res.status(200).json({ message: "Nenhuma pauta relevante encontrada." });

        console.log(`HF Analisando: ${targetArticle.title}...`);
        const translatedData = await translateArticle(targetArticle, HF_TOKEN);
        if (!translatedData) throw new Error("Falha na IA HuggingFace após tentativas.");

        const imageBaseUrl = "https://www.masterduelmeta.com";
        let finalImageUrl = targetArticle.image?.startsWith('http') ? targetArticle.image : `${imageBaseUrl}${targetArticle.image}`;

        await supabaseAdmin.from('news_posts').insert({
            author_id: META_BOT_ID,
            title: translatedData.title_pt,
            content: translatedData.content_html,
            banner_url: finalImageUrl
        });

        return res.status(200).json({ success: true, title: translatedData.title_pt });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}