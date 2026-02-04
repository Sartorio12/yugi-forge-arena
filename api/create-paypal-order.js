import { PAYPAL_CONFIG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper to get Access Token
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

  const { betId } = req.body;

  if (!betId) {
    return res.status(400).json({ error: 'Missing betId' });
  }

  try {
    // 1. Fetch Bet
    const { data: bet, error: betError } = await supabase
        .from('sweepstake_bets')
        .select('*, sweepstakes(entry_fee, title)')
        .eq('id', betId)
        .single();

    if (betError || !bet) {
        return res.status(404).json({ error: 'Bet not found' });
    }

    const amount = bet.sweepstakes.entry_fee; // BRL

    // 2. Get Access Token
    const accessToken = await getAccessToken();

    // 3. Create Order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: betId.toString(),
          amount: {
            currency_code: "BRL",
            value: amount.toFixed(2),
          },
          description: `Bolão: ${bet.sweepstakes.title}`
        },
      ],
      application_context: {
        return_url: `${req.headers.origin}/bolao?success=true&betId=${betId}`,
        cancel_url: `${req.headers.origin}/bolao?cancel=true`,
        brand_name: "Yugi Forge Arena",
        user_action: "PAY_NOW"
      }
    };

    const response = await fetch(`${PAYPAL_CONFIG.API_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("PayPal Create Order Error:", data);
        return res.status(500).json({ error: 'Failed to create PayPal order', details: data });
    }

    // 4. Update Bet (Optional, maybe just on capture)
    // We update here to track the attempt
    await supabase.from('sweepstake_bets').update({
        payment_method: 'paypal',
        transaction_id: data.id,
        payment_amount: amount
    }).eq('id', betId);

    return res.status(200).json(data);

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
