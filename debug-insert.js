import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Pegar ID
    const { data: decks } = await supabase.from('decks').select('id').eq('deck_name', 'Unchained Fiendsmith').limit(1);
    const targetId = decks[0].id;

    console.log(`Tentando inserir comentário no deck ${targetId}...`);

    // 2. Insert com DEBUG
    const { data, error } = await supabase
        .from('deck_comments')
        .insert({
            deck_id: targetId,
            user_id: META_BOT_ID,
            content: "Teste de Debug do MetaBot."
        })
        .select(); // IMPORTANTE: .select() força o retorno dos dados inseridos, ajudando a revelar erros de RLS

    if (error) {
        console.error("❌ ERRO NO INSERT:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("✅ SUCESSO! Dados retornados:");
        console.log(data);
    }
}

run();
