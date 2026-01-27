import handler from '../api/sync-meta-decks.js';

// Mock Request/Response objects
const req = {
    method: 'GET',
    headers: {
        authorization: `Bearer ${process.env.CRON_SECRET || ''}` // Optional locally
    }
};

const res = {
    status: (code) => ({
        json: (data) => {
            console.log(`
--- RESULTADO (${code}) ---`);
            console.log(JSON.stringify(data, null, 2));
        }
    })
};

// Run
console.log("Executando sincronização manual...");
handler(req, res);

