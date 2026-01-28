import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// CONFIGURAÇÃO
// --------------------------------------------------------------------------

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
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!SUPABASE_SERVICE_ROLE_KEY) return res.status(500).json({ error: "CONFIG_ERROR: SUPABASE_SERVICE_ROLE_KEY ausente." });
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "CONFIG_ERROR: GEMINI_API_KEY ausente." });

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        console.log("Acordando MetaBot Social...");

        // Carregar Contexto
        const { data: tierData } = await supabaseAdmin
            .from('tier_list')
            .select('deck_name, tier')
            .order('tier', { ascending: true })
            .limit(10);
        
        const tierListSummary = tierData 
            ? tierData.map(t => `- ${t.deck_name} (Tier ${t.tier})`).join('\n')
            : "Contexto Indisponível (Assuma que Snake-Eye é Tier 1)";

        // Buscar decks candidatos (Top 20 recentes)
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

        // Embaralhar para tentar encontrar um válido
        const shuffledDecks = targetDecks.sort(() => 0.5 - Math.random());

        for (const targetDeck of shuffledDecks) {
            // Check duplicidade
            const { data: existingComment } = await supabaseAdmin
                .from('deck_comments')
                .select('id')
                .eq('deck_id', targetDeck.id)
                .eq('user_id', META_BOT_ID)
                .maybeSingle();

            if (existingComment) continue; // Pula este deck

            // Check cartas
            const { data: deckCards } = await supabaseAdmin
                .from('deck_cards')
                .select('cards(name)')
                .eq('deck_id', targetDeck.id);
            
            if (!deckCards || deckCards.length < 5) {
                console.log(`Deck ${targetDeck.deck_name} tem poucas cartas (${deckCards?.length}), pulando.`);
                continue; // Deck vazio ou incompleto, pula
            }

            const cardList = deckCards.map(d => d.cards?.name).filter(Boolean);

            // ACHAMOS UM DECK VÁLIDO!
            console.log(`Analisando deck: ${targetDeck.deck_name}...`);
            const aiComment = await generateComment(targetDeck.deck_name, cardList, tierListSummary, genAI);

            if (aiComment) {
                await supabaseAdmin
                    .from('deck_comments')
                    .insert({ deck_id: targetDeck.id, user_id: META_BOT_ID, content: aiComment });

                await supabaseAdmin
                    .from('deck_likes')
                    .insert({ deck_id: targetDeck.id, user_id: META_BOT_ID })
                    .ignore();

                return res.status(200).json({ 
                    success: true, 
                    deck: targetDeck.deck_name,
                    comment: aiComment
                });
            }
        }

        return res.status(200).json({ message: "Nenhum deck válido encontrado na lista recente (todos comentados ou vazios)." });

    } catch (error) {
        console.error("Erro fatal:", error);
        return res.status(500).json({ error: error.message });
    }
}