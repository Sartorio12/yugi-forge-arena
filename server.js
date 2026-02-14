import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import createMpPayment from './api/create-mercadopago-payment.js';
import checkMpStatus from './api/check-mercadopago-status.js';
import createPaypalOrder from './api/create-paypal-order.js';
import capturePaypalOrder from './api/capture-paypal-order.js';
import webhookMp from './api/webhooks/mercadopago.js';
import getYoutubeLive from './api/get-youtube-live.js';

const app = express();
const port = 3000;

// Manual CORS middleware since we can't install 'cors' package
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Allow all origins for dev
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
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

// Routes
app.post('/api/create-mercadopago-payment', adapter(createMpPayment));
app.post('/api/check-mercadopago-status', adapter(checkMpStatus));
app.post('/api/create-paypal-order', adapter(createPaypalOrder));
app.post('/api/capture-paypal-order', adapter(capturePaypalOrder));
app.post('/api/webhooks/mercadopago', adapter(webhookMp));
app.get('/api/get-youtube-live', adapter(getYoutubeLive));

app.listen(port, () => {
  console.log(`Local API Server running at http://localhost:${port}`);
  console.log(`- POST /api/create-mercadopago-payment`);
  console.log(`- POST /api/check-mercadopago-status`);
  console.log(`- POST /api/create-paypal-order`);
  console.log(`- POST /api/capture-paypal-order`);
});