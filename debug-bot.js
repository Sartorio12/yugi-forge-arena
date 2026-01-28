import socialHandler from './api/metabot-social.js';
import newsHandler from './api/metabot-news.js';

// Mock simples dos objetos Express (req, res)
const res = {
    status: (code) => {
        return {
            json: (data) => {
                console.log(`\n[STATUS ${code}] RESPOSTA:`);
                console.log(JSON.stringify(data, null, 2));
            }
        };
    }
};

const req = {
    headers: {
        'x-vercel-cron': '1', // Simula que é o Cron chamando (pula senha)
        'authorization': 'Bearer LOCAL_TEST'
    }
};

async function run() {
    try {
        console.log("=========================================");
        console.log("🤖 INICIANDO DEBUG DO METABOT (LOCAL)");
        console.log("=========================================");

        console.log("\n1. Testando Módulo SOCIAL (Comentários)...");
        await socialHandler(req, res);

        console.log("\n-----------------------------------------");

        console.log("\n2. Testando Módulo NEWS (Jornalista)...");
        await newsHandler(req, res);

        console.log("\n=========================================");
        console.log("✅ FIM DO DEBUG");
        
    } catch (e) {
        console.error("❌ ERRO NO SCRIPT DE DEBUG:", e);
    }
}

run();
