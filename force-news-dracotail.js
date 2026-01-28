import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Repostando Guia Dracotail (Versão Visual Premium)...");

    // Estilos Inline para garantir legibilidade no tema Dark
    const styleP = 'style="color: #e2e8f0; font-size: 1.1rem; line-height: 1.7; margin-bottom: 1.2rem;"';
    const styleH2 = 'style="color: #60a5fa; font-size: 1.8rem; font-weight: bold; margin-top: 2.5rem; margin-bottom: 1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem;"';
    const styleLi = 'style="color: #cbd5e1; margin-bottom: 0.5rem;"';
    const styleB = 'style="color: #f472b6;"'; // Um rosa/vermelho para destaque
    const styleImg = 'style="width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);"';

    // Imagem de capa (Banner) inserida manualmente no conteúdo
    const bannerImg = "https://images.ygoprodeck.com/images/cards/54408735.jpg"; // Cartesia (Arte bonita) ou Dracotail

    const contentHTML = `
    <!-- Capa Inserida Manualmente -->
    <img src="${bannerImg}" alt="Capa Dracotail" ${styleImg}>

    <p ${styleP}>E aí, duelistas! <b ${styleB}>MetaBot</b> na área trazendo as novidades do campo de batalha! 🤖🔥</p>
    
    <p ${styleP}>Hoje o papo é sobre uma estratégia que está voando baixo no radar mas tem um potencial absurdo de grind: <b ${styleB}>DRACOTAIL</b>.</p>

    <h2 ${styleH2}>🐉 Como funciona essa parada?</h2>
    <p ${styleP}>Esqueça aqueles combos de 15 minutos que terminam num campo inquebrável (e que perdem pra uma pedra). O Dracotail é um deck de <b ${styleB}>Fusão Mid-Range</b>. O foco aqui é gerar recursos infinitos.</p>
    <ul style="list-style-type: disc; padding-left: 20px;">
        <li ${styleLi}><b ${styleB}>Mecânica Única:</b> Sempre que um monstro Dracotail é usado para Fusão, ele "seta" uma Magia/Armadilha direto do deck.</li>
        <li ${styleLi}><b ${styleB}>Turno Zero:</b> Sim, você pode jogar no turno do oponente graças às Armadilhas que permitem Fusão rápida.</li>
    </ul>

    <h2 ${styleH2}>✅ Pontos Fortes</h2>
    <p ${styleP}>O deck brilha quando o jogo se estende. Se você sobreviver ao turno 2, dificilmente perderá no recurso.</p>
    <ul style="list-style-type: disc; padding-left: 20px;">
        <li ${styleLi}><b ${styleB}>Resiliência:</b> Toma <i>Nibiru</i> e ri. Toma <i>Maxx "C"</i> e joga tranquilo (poucas summons).</li>
        <li ${styleLi}><b ${styleB}>Versátil:</b> Funciona puro ou misturado com <b>Branded</b>, <b>Shaddoll</b> ou <b>Magistus</b>.</li>
    </ul>

    <h2 ${styleH2}>❌ Onde o calo aperta</h2>
    <p ${styleP}>Nem tudo são flores. O deck sofre para monstros "Torre" (tipo <i>Purrely Noir</i>) e odeia cartas que banem o cemitério (<i>Dimension Shifter</i> é pesadelo).</p>

    <div style="text-align:center; margin: 30px 0;">
        <p ${styleP} style="font-size: 0.9em; color: #94a3b8; font-style: italic;">"Blazing Cartesia é a melhor amiga desse deck."</p>
    </div>

    <h2 ${styleH2}>🧠 Veredito do MetaBot</h2>
    <p ${styleP}>Se você curte um duelo pensado, interativo e odeia perder porque "o oponente não deixou você jogar", Dracotail é uma ótima pedida. É Tier 1? Talvez não. É divertido? Com certeza.</p>
    
    <hr style="border-color: #334155; margin: 2rem 0;">
    <p ${styleP} style="font-size: 0.9rem; text-align: right;"><i>Fonte: Análise baseada no guia do Master Duel Meta.</i></p>
    `;

    // Deletar a versão anterior feia
    await supabase.from('news_posts').delete().eq('title', "Guia Dracotail: O Rei do Grind Game").eq('author_id', META_BOT_ID);

    const { data, error } = await supabase.from('news_posts').insert({
        author_id: META_BOT_ID,
        title: "Guia Dracotail: O Rei do Grind Game",
        content: contentHTML,
        banner_url: bannerImg // Mantemos aqui também por compatibilidade futura
    }).select();

    if (error) {
        console.error("❌ Erro:", error);
    } else {
        console.log("✅ GUIA (VISUAL PREMIUM) POSTADO!");
    }
}

run();