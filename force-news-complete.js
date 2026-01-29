import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Reescrevendo a notícia Dracotail com detalhes máximos...");

    const styleP = 'style="color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; margin-bottom: 0.8rem;"';
    const styleH2 = 'style="color: #60a5fa; font-size: 1.4rem; font-weight: bold; margin-top: 1.8rem; margin-bottom: 0.6rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.3rem;"';
    const styleLi = 'style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.4rem;"';
    const styleB = 'style="color: #f472b6;"'; 
    const styleImg = 'style="width: 100%; max-height: 350px; object-fit: cover; object-position: center 25%; border-radius: 10px; margin-bottom: 1.5rem; border: 1px solid #334155; scale: 1.2;"';

    const bannerUrl = "https://ms.yugipedia.com//thumb/c/ca/DracotailFaimena-JUSH-EN-UR-1E.png/685px-DracotailFaimena-JUSH-EN-UR-1E.png";

    const contentHTML = `
    <div style="overflow: hidden; border-radius: 10px; margin-bottom: 1rem;">
        <img src="${bannerUrl}" alt="Dracotail Banner" ${styleImg}>
    </div>

    <p ${styleP}>Fala, galera! O <b>MetaBot</b> voltou para dissecar um arquétipo que está chamando atenção pela sua resiliência: os <b ${styleB}>Dracotail</b>. Se você gosta de gerenciar recursos e não quer depender de um combo de "tudo ou nada", preste atenção.</p>

    <h2 ${styleH2}>🧪 A Estratégia Central</h2>
    <p ${styleP}>Dracotail é um motor de <b ${styleB}>Fusão Mid-Range</b> focado em vantagem incremental. A grande sacada do deck é que seus monstros, ao serem usados como material de fusão, permitem que você <b ${styleB}>Sete Magias/Armadilhas direto do Deck</b>. Isso cria um loop de recursos difícil de quebrar.</p>

    <h2 ${styleH2}>👾 Monstros Principais (O Coração da Engine)</h2>
    <ul style="list-style-type: square; padding-left: 20px;">
        <li ${styleLi}><b ${styleB}>Dracotail Lukias:</b> O buscador principal. Essencial para garantir que você tenha as peças certas na mão.</li>
        <li ${styleLi}><b ${styleB}>Dracotail Faimena:</b> O coração do deck. Ela permite realizar Invocações-Fusão durante a Fase Principal como um <i>Quick Effect</i>, possibilitando jogadas no turno do oponente.</li>
        <li ${styleLi}><b ${styleB}>Dracotail Mululu:</b> Uma excelente invocação normal que também ajuda no processo de fusão e oferece controle de campo.</li>
        <li ${styleLi}><b ${styleB}>Dracotail Arthalion:</b> O "boss" do Extra Deck que recicla seus recursos e mantém o fluxo de jogo ativo.</li>
    </ul>

    <h2 ${styleH2}>🪄 Magias e Armadilhas de Suporte</h2>
    <p ${styleP}>As cartas <b>Rahu Dracotail</b> e <b>Ketu Dracotail</b> são fundamentais. Elas não são apenas cartas de fusão comuns; elas permitem interações rápidas e recuperação de materiais, tornando o deck extremamente econômico em termos de cartas na mão.</p>

    <h2 ${styleH2}>🤝 Hibridização e Engines</h2>
    <p ${styleP}>O Dracotail brilha quando misturado. Engines como <b ${styleB}>Branded</b> (para mais poder de fogo) ou <b ${styleB}>Shaddoll</b> (para controle disruptivo) funcionam perfeitamente, já que compartilham a sinergia de Fusão e o uso de monstros de Atributos variados.</p>

    <h2 ${styleH2}>⚠️ Pontos Fracos e Counters</h2>
    <p ${styleP}>Como todo deck de cemitério e recursos, ele sofre para cartas que banem (<i>Dimension Shifter</i>, <i>Macro Cosmos</i>). Além disso, negar a <b>Invocação Normal</b> inicial pode ser fatal se você não tiver estendidores na mão.</p>

    <h2 ${styleH2}>💭 Veredito Final</h2>
    <p ${styleP}>É um deck de <b ${styleB}>Tier 2/Rogue de alto nível</b>. No Master Duel, onde o formato <i>Best of 1</i> reina, a capacidade do Dracotail de surpreender no turno zero é uma vantagem competitiva imensa. Recomendo para quem gosta de duelos cerebrais!</p>

    <hr style="border-color: #1e293b; margin: 1.5rem 0;">
    <p ${styleP} style="font-size: 0.8rem; text-align: right; color: #64748b;"><i>Fonte original: Guia Dracotail - Master Duel Meta</i></p>
    `;

    const { error } = await supabase
        .from('news_posts')
        .update({ 
            content: contentHTML,
            banner_url: bannerUrl
        })
        .eq('title', "Guia Dracotail: O Rei do Grind Game");

    if (error) {
        console.error("Erro:", error);
    } else {
        console.log("✅ NOTÍCIA REESCRITA COM SUCESSO (VERSÃO COMPLETA)!");
    }
}

run();
