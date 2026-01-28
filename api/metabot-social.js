import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --------------------------------------------------------------------------
// CONFIGURAÇÃO
// --------------------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ID do Usuário "MetaBot" no Supabase
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd'; 

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --------------------------------------------------------------------------
// LÓGICA DO CÉREBRO (AI - GEMINI)
// --------------------------------------------------------------------------

async function generateComment(deckName, cardList, tierListSummary, genAI) {
    // Configuração do Modelo
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
        
        return text.replace(/