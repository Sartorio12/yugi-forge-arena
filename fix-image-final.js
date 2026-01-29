import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Ajustando imagem para versão Cropped (Melhor para Banner)...");
    
    // Imagem "Cropped" (Arte apenas) costuma ser melhor para banner horizontal
    // ID do Dracotail Faimena (exemplo) ou similar.
    // Vou usar uma arte de alta qualidade do MDM se possível, mas YGOPRODeck Cropped é safe.
    // Usando ID do Granguignol que tem a ver com Cartesia/Dracotail theme e é bonito
    const bannerUrl = "https://images.ygoprodeck.com/images/cards_cropped/101110011.jpg"; // Cartesia Cropped

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            banner_url: bannerUrl,
            // Atualiza também a imagem interna para a versão completa (vertical) para leitura
            content: (await supabase.from('news_posts').select('content').eq('title', "Guia Dracotail: O Rei do Grind Game").single()).data.content.replace(/src="[^"]*"/, `src="https://images.ygoprodeck.com/images/cards/101110011.jpg"`)
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ Imagens atualizadas (Capa Cropped + Corpo Full)!");
    }
}

run();
