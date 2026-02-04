import { PAYPAL_CONFIG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CONFIG.CLIENT_ID}:${PAYPAL_CONFIG.SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_CONFIG.API_URL}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderID } = req.body;

  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_CONFIG.API_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
        // If it's already captured, we might get an error, but let's check details
        console.error("PayPal Capture Error:", data);
        return res.status(500).json({ error: 'Failed to capture payment', details: data });
    }

    // Check if COMPLETED
    if (data.status === 'COMPLETED') {
        const purchaseUnit = data.purchase_units[0];
        const betId = purchaseUnit.reference_id; // We stored betId here

        // Update DB
        const { error: dbError } = await supabase.from('sweepstake_bets').update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
        }).eq('id', betId);

        if (dbError) throw dbError;

        return res.status(200).json({ success: true, data });
    } else {
        return res.status(400).json({ error: 'Payment not completed', status: data.status });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
