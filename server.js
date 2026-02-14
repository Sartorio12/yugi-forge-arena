import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import paymentsHandler from './api/payments.js';
import metabotHandler from './api/metabot.js';
import systemHandler from './api/system.js';
import webhookMp from './api/webhooks/mercadopago.js';

const app = express();
const port = 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Helper to adapt Vercel function signature (req, res) to Express
const adapter = (handler) => async (req, res) => {
    try {
        await handler(req, res);
    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Consolidated Routes
app.all('/api/payments', adapter(paymentsHandler));
app.all('/api/metabot', adapter(metabotHandler));
app.all('/api/system', adapter(systemHandler));
app.post('/api/webhooks/mercadopago', adapter(webhookMp));

// Compatibility redirects for local dev if needed
app.get('/api/get-youtube-live', (req, res) => {
    req.query.action = 'get-youtube-live';
    systemHandler(req, res);
});

app.listen(port, () => {
  console.log(`Consolidated API Server running at http://localhost:${port}`);
});