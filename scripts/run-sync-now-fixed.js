// Set ENV vars manually for local execution
process.env.VITE_SUPABASE_URL = "https://mggwlfbajeqbdgkflmqi.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo";

import handler from '../api/sync-meta-decks.js';

const req = {
    method: 'GET',
    headers: {}
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

console.log("Executando sincronização manual com credenciais injetadas...");
handler(req, res);
