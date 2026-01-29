import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Atualizando imagem para Dracotail Faimena (Yugipedia)...");
    
    const bannerUrl = "https://ms.yugipedia.com//thumb/c/ca/DracotailFaimena-JUSH-EN-UR-1E.png/685px-DracotailFaimena-JUSH-EN-UR-1E.png";

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            banner_url: bannerUrl,
            content: (await supabase.from('news_posts').select('content').eq('title', "Guia Dracotail: O Rei do Grind Game").single()).data.content.replace(/src="[^"]*"/, `src="${bannerUrl}"`)
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ Imagem Real Dracotail salva!");
        console.log(`URL: ${bannerUrl}`);
    }
}

run();
