import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Atualizando imagem da notícia para um link seguro (Unsplash)...");
    
    // Imagem genérica de fantasia/dragão do Unsplash
    const safeImage = "https://images.unsplash.com/photo-1642430239247-46522c7eb7ce?q=80&w=1000&auto=format&fit=crop";

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            banner_url: safeImage,
            // Atualiza também o HTML para usar a nova imagem
            content: (await supabase.from('news_posts').select('content').eq('title', "Guia Dracotail: O Rei do Grind Game").single()).data.content.replace(/src="[^"]*"/, `src="${safeImage}"`)
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ Imagem atualizada no Banco de Dados!");
        console.log("Recarregue a página da notícia.");
    }
}

run();
