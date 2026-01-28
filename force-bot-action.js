import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: decks } = await supabase.from('decks').select('id, deck_name').eq('deck_name', 'Unchained Fiendsmith').limit(1);
    
    if (!decks || decks.length === 0) return;
    
    const target = decks[0];
    const comment = "Unchained Fiendsmith é puro suco de meta! Essa combinação gera vantagem demais. Só cuidado com o Nibiru na hora errada. Belo deck!";
    
    // CORREÇÃO: Usando 'comment_text'
    const { data, error } = await supabase.from('deck_comments').insert({
        deck_id: target.id,
        user_id: META_BOT_ID,
        comment_text: comment, // <--- Corrigido
    }).select();
    
    if (error) {
        console.error("❌ Erro:", error);
    } else {
        console.log(`\n✅ SUCESSO REAL! Comentário inserido.`);
        console.log(`🎴 Deck: "${target.deck_name}"`);
        console.log(`💬 Texto: "${comment}"`);
        console.log("Pode conferir no site agora!");
    }
}

run();
