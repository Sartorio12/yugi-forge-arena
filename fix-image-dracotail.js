import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Atualizando imagem para Dracotail Faimena (YGOPRODeck)...");
    
    // Dracotail Faimena (Full Card)
    const bannerUrl = "https://images.ygoprodeck.com/images/cards/101202006.jpg";

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            banner_url: bannerUrl,
            // Atualiza também a imagem interna
            content: (await supabase.from('news_posts').select('content').eq('title', "Guia Dracotail: O Rei do Grind Game").single()).data.content.replace(/src="[^"]*"/, `src="${bannerUrl}"`)
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ Imagem Dracotail salva!");
    }
}

run();
