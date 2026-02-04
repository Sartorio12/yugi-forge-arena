import { MERCADOPAGO_CONFIG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  const { betId, email, firstName, lastName } = req.body;

  if (!betId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Fetch Bet details to confirm amount
    const { data: bet, error: betError } = await supabase
        .from('sweepstake_bets')
        .select('*, sweepstakes(entry_fee, title)')
        .eq('id', betId)
        .single();

    if (betError || !bet) {
        return res.status(404).json({ error: 'Bet not found' });
    }

    const amount = parseFloat(bet.sweepstakes.entry_fee);

    // 2. Create Payment in Mercado Pago
    const paymentData = {
      transaction_amount: amount,
      description: `Bolão: ${bet.sweepstakes.title}`,
      payment_method_id: "pix",
      payer: {
        email: email,
        first_name: firstName || "Duelist",
        last_name: lastName || "Player"
      },
      external_reference: betId.toString(),
      notification_url: "https://www.google.com" // Placeholder for localhost testing
    };

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}`,
        "X-Idempotency-Key": `bet-${betId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData)
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("MP Error:", data);
        return res.status(500).json({ error: 'Failed to create payment', details: data });
    }

    // 3. Update Bet with Transaction ID
    await supabase.from('sweepstake_bets').update({
        payment_method: 'mercadopago',
        transaction_id: data.id.toString(),
        payment_amount: amount
    }).eq('id', betId);

    // 4. Return QR Code data
    if (data.point_of_interaction && data.point_of_interaction.transaction_data) {
        return res.status(200).json({
            id: data.id,
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
            ticket_url: data.point_of_interaction.transaction_data.ticket_url
        });
    } else {
        return res.status(500).json({ error: 'Invalid response from Mercado Pago', details: data });
    }

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}