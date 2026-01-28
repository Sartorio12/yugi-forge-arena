import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: news } = await supabase
        .from('news_posts')
        .select('title, banner_url, content')
        .eq('title', "Guia Dracotail: O Rei do Grind Game")
        .limit(1);

    if (news && news.length > 0) {
        const post = news[0];
        console.log("--- BANCO DE DADOS ---");
        console.log(`Title: ${post.title}`);
        console.log(`Banner URL: ${post.banner_url ? post.banner_url : "❌ VAZIO"}`);
        console.log(`Content tem <img>? ${post.content.includes('<img') ? "✅ SIM" : "❌ NÃO"}`);
        console.log("Preview Content:", post.content.substring(0, 100));
    } else {
        console.log("Notícia não encontrada.");
    }
}

check();
