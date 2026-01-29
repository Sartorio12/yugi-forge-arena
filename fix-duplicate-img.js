import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Removendo imagem duplicada do conteúdo...");

    const { data: post } = await supabase
        .from('news_posts')
        .select('content')
        .eq('title', "Guia Dracotail: O Rei do Grind Game")
        .single();

    if (post && post.content) {
        // Remove o bloco da imagem que está no topo do HTML
        const newContent = post.content.replace(/<div style="overflow: hidden;[\s\S]*?<\/div>/, "");

        const { error } = await supabase
            .from('news_posts')
            .update({ content: newContent })
            .eq('title', "Guia Dracotail: O Rei do Grind Game");

        if (error) {
            console.error("Erro ao atualizar:", error);
        } else {
            console.log("✅ Imagem duplicada removida! Agora o site usará apenas o banner oficial.");
        }
    }
}

run();
