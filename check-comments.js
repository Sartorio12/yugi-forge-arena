import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // 1. Pegar o ID do deck
    const { data: decks } = await supabase
        .from('decks')
        .select('id, deck_name')
        .eq('deck_name', 'Unchained Fiendsmith')
        .limit(1);

    if (!decks || decks.length === 0) {
        console.log("Deck não encontrado.");
        return;
    }
    const deckId = decks[0].id;
    console.log(`Deck ID: ${deckId}`);

    // 2. Verificar Comentários
    const { data: comments, error: cError } = await supabase
        .from('deck_comments')
        .select('*')
        .eq('deck_id', deckId);

    console.log("\n--- COMENTÁRIOS NO BANCO ---");
    if (comments && comments.length > 0) {
        comments.forEach(c => {
            console.log(`[${c.created_at}] User: ${c.user_id} | Content: "${c.content}"`);
        });
    } else {
        console.log("Nenhum comentário encontrado. Erro:", cError);
    }

    // 3. Verificar Likes
    const { data: likes } = await supabase
        .from('deck_likes')
        .select('*')
        .eq('deck_id', deckId)
        .eq('user_id', META_BOT_ID);

    console.log("\n--- LIKES NO BANCO ---");
    console.log(likes && likes.length > 0 ? "Like encontrado." : "Sem like.");
}

check();
