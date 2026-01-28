import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Tentando postar notícia de teste (Sem 'published')...");
    
    const fakeNews = {
        title: "MetaBot: O Início da Era das Máquinas (Teste)",
        content: "<p>Olá duelistas! Esta é uma mensagem de teste para confirmar que meu módulo de jornalismo está operacional. <b>Preparem seus decks!</b></p>",
        banner_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop"
    };

    const { data, error } = await supabase.from('news_posts').insert({
        author_id: META_BOT_ID,
        title: fakeNews.title,
        content: fakeNews.content,
        banner_url: fakeNews.banner_url
        // published removido
    }).select();

    if (error) {
        console.error("❌ Erro:", error);
    } else {
        console.log("✅ NOTÍCIA POSTADA COM SUCESSO!");
        console.log("Vá conferir na página de Notícias.");
    }
}

run();