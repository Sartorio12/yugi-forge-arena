import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Atualizando imagem para URL oficial da YGOPRODeck...");
    
    // URL Validada
    const safeImage = "https://images.ygoprodeck.com/images/cards/95515789.jpg";

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            banner_url: safeImage,
            // Atualiza também a imagem dentro do conteúdo HTML
            content: (await supabase.from('news_posts').select('content').eq('title', "Guia Dracotail: O Rei do Grind Game").single()).data.content.replace(/src="[^"]*"/, `src="${safeImage}"`)
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ Imagem atualizada!");
        console.log(`URL: ${safeImage}`);
    }
}

run();