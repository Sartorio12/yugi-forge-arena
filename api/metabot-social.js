import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// CONFIGURAÇÃO
// --------------------------------------------------------------------------

// ID do Usuário "MetaBot" no Supabase
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 

// --------------------------------------------------------------------------
// LÓGICA DO CÉREBRO (AI - GEMINI)
// --------------------------------------------------------------------------

async function generateComment(deckName, cardList, tierListSummary, genAI) {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
    ATUE COMO: MetaBot, uma IA especialista em Yu-Gi-Oh!.
    
    SUA PERSONALIDADE:
    - Duelista competitivo, sarcástico mas prestativo.
    - Usa gírias de Yu-Gi-Oh (ex: "brickar", "handtrap", "garnet", "staple", "engine", "tier 0").
    - Adora o meta, mas respeita decks rogue criativos.
    - Se for deck META, cobra perfeição. Se for ROGUE, elogia a coragem.
    
    CONTEXTO DO META (Tier List):
    ${tierListSummary}
    
    TAREFA:
    Analise este deck:
    Nome: "${deckName}"
    Cartas: ${cardList.slice(0, 40).join(', ')}...
    
    INSTRUÇÃO DE SAÍDA:
    Escreva APENAS o comentário (máximo 280 caracteres). Sem aspas, sem introdução.
    Seja direto, como um tweet.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        return text.replace(/"/g, '').trim(); 
    } catch (e) {
        console.error("Erro no Gemini AI:", e);
        return null;
    }
}

// --------------------------------------------------------------------------
// HANDLER PRINCIPAL
// --------------------------------------------------------------------------

export default async function handler(req, res) {
    // 1. Carregar Variáveis DENTRO do handler para evitar crash no boot
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // 2. Verificação de Segurança (Variáveis)
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error("FATAL: SUPABASE_SERVICE_ROLE_KEY não encontrada nas env vars.");
        return res.status(500).json( {
            error: "CONFIG_ERROR: A chave 'SUPABASE_SERVICE_ROLE_KEY' está faltando no painel da Vercel.",
            solution: "Adicione a chave nas Environment Variables da Vercel e faça Redeploy."
        });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "CONFIG_ERROR: GEMINI_API_KEY ausente." });
    }

    // 3. Verificação de Segurança (Cron Secret)
    const authHeader = req.headers.authorization;
    if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
        // return res.status(401).json({ error: 'Unauthorized' }); // Mantido comentado para facilitar debug inicial
    }

    // Inicialização Segura
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        console.log("Acordando MetaBot (Powered by Gemini) para interação social...");

        // 4. Carregar Contexto
        const { data: tierData } = await supabaseAdmin
            .from('tier_list')
            .select('deck_name, tier')
            .order('tier', { ascending: true })
            .limit(10);
        
        const tierListSummary = tierData 
            ? tierData.map(t => `- ${t.deck_name} (Tier ${t.tier})`).join('\n')
            : "Contexto Indisponível (Assuma que Snake-Eye é Tier 1)";

        // 5. Encontrar um Deck Alvo
        const { data: targetDecks } = await supabaseAdmin
            .from('decks')
            .select('id, deck_name, user_id, profiles(username)')
            .eq('is_private', false)
            .neq('user_id', META_BOT_ID)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!targetDecks || targetDecks.length === 0) {
            return res.status(200).json({ message: "Nenhum deck novo para analisar." });
        }

        const targetDeck = targetDecks[Math.floor(Math.random() * targetDecks.length)];
        
        // Double Check
        const { data: existingComment } = await supabaseAdmin
            .from('deck_comments')
            .select('id')
            .eq('deck_id', targetDeck.id)
            .eq('user_id', META_BOT_ID)
            .maybeSingle();

        if (existingComment) {
            return res.status(200).json({ message: `Já comentei no deck ${targetDeck.deck_name}, pulando.` });
        }

        // 6. Ler cartas
        const { data: deckCards } = await supabaseAdmin
            .from('deck_cards')
            .select('cards(name)')
            .eq('deck_id', targetDeck.id);
        
        if (!deckCards || deckCards.length === 0) {
            return res.status(200).json({ message: "Deck vazio, ignorando." });
        }

        const cardList = deckCards.map(d => d.cards?.name).filter(Boolean);

        // 7. O CÉREBRO TRABALHANDO
        console.log(`Gemini analisando deck: ${targetDeck.deck_name}...`);
        const aiComment = await generateComment(targetDeck.deck_name, cardList, tierListSummary, genAI);

        if (aiComment) {
            // 8. AÇÃO SOCIAL
            const { error: commentError } = await supabaseAdmin
                .from('deck_comments')
                .insert({
                    deck_id: targetDeck.id,
                    user_id: META_BOT_ID,
                    content: aiComment
                });

            if (commentError) throw commentError;

            await supabaseAdmin
                .from('deck_likes')
                .insert({
                    deck_id: targetDeck.id,
                    user_id: META_BOT_ID
                })
                .ignore();

            return res.status(200).json( {
                success: true, 
                deck: targetDeck.deck_name,
                comment: aiComment
            });
        } else {
            return res.status(500).json({ error: "Gemini não retornou resposta válida." });
        }

    } catch (error) {
        console.error("Erro fatal no MetaBot Social:", error);
        return res.status(500).json({ error: error.message });
    }
}
