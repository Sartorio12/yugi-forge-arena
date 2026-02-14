import { MERCADOPAGO_CONFIG, PAYPAL_CONFIG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
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

  const { action } = req.query;

  try {
    // --- MERCADO PAGO: CREATE ---
    if (action === 'create-mercadopago') {
      const { betId, email, firstName, lastName } = req.body;
      if (!betId || !email) return res.status(400).json({ error: 'Missing required fields' });

      const { data: bet } = await supabase.from('sweepstake_bets').select('*, sweepstakes(entry_fee, title)').eq('id', betId).single();
      if (!bet) return res.status(404).json({ error: 'Bet not found' });

      const amount = parseFloat(bet.sweepstakes.entry_fee);
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}`,
          "X-Idempotency-Key": `bet-${betId}-${Date.now()}`
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Bolão: ${bet.sweepstakes.title}`,
          payment_method_id: "pix",
          payer: { email, first_name: firstName || "Duelist", last_name: lastName || "Player" },
          external_reference: betId.toString(),
          notification_url: "https://www.google.com"
        })
      });

      const data = await response.json();
      if (!response.ok) return res.status(500).json({ error: 'MP Error', details: data });

      await supabase.from('sweepstake_bets').update({ payment_method: 'mercadopago', transaction_id: data.id.toString(), payment_amount: amount }).eq('id', betId);

      return res.status(200).json({
        id: data.id,
        qr_code: data.point_of_interaction?.transaction_data?.qr_code,
        qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
        ticket_url: data.point_of_interaction?.transaction_data?.ticket_url
      });
    }

    // --- MERCADO PAGO: CHECK STATUS ---
    if (action === 'check-mercadopago') {
      const { betId } = req.body;
      if (!betId) return res.status(400).json({ error: 'Missing betId' });

      const { data: bet } = await supabase.from('sweepstake_bets').select('transaction_id, payment_status').eq('id', betId).single();
      if (!bet) return res.status(404).json({ error: 'Bet not found' });
      if (bet.payment_status === 'paid') return res.json({ status: 'paid' });

      const searchResponse = await fetch(`https://api.mercadopago.com/v1/payments/search?external_reference=${betId}&status=approved`, {
        headers: { Authorization: `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}` }
      });
      const searchData = await searchResponse.json();

      if (searchData.results?.length > 0) {
        await supabase.from('sweepstake_bets').update({ payment_status: 'paid', payment_method: 'mercadopago', transaction_id: searchData.results[0].id.toString(), updated_at: new Date().toISOString() }).eq('id', betId);
        return res.json({ status: 'paid' });
      }
      return res.json({ status: 'pending' });
    }

    // --- PAYPAL: CREATE ---
    if (action === 'create-paypal') {
        const { betId } = req.body;
        const { data: bet } = await supabase.from('sweepstake_bets').select('*, sweepstakes(entry_fee, title)').eq('id', betId).single();
        if (!bet) return res.status(404).json({ error: 'Bet not found' });

        const auth = Buffer.from(`${PAYPAL_CONFIG.CLIENT_ID}:${PAYPAL_CONFIG.CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(`${PAYPAL_CONFIG.API_URL}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: { Authorization: `Basic ${auth}` }
        });
        const { access_token } = await tokenRes.json();

        const orderRes = await fetch(`${PAYPAL_CONFIG.API_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: { currency_code: 'BRL', value: bet.sweepstakes.entry_fee.toString() },
                    reference_id: betId.toString()
                }]
            })
        });
        const orderData = await orderRes.json();
        return res.status(200).json(orderData);
    }

    // --- PAYPAL: CAPTURE ---
    if (action === 'capture-paypal') {
        const { orderId, betId } = req.body;
        const auth = Buffer.from(`${PAYPAL_CONFIG.CLIENT_ID}:${PAYPAL_CONFIG.CLIENT_SECRET}`).toString('base64');
        const tokenRes = await fetch(`${PAYPAL_CONFIG.API_URL}/v1/oauth2/token`, {
            method: 'POST',
            body: 'grant_type=client_credentials',
            headers: { Authorization: `Basic ${auth}` }
        });
        const { access_token } = await tokenRes.json();

        const captureRes = await fetch(`${PAYPAL_CONFIG.API_URL}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` }
        });
        const captureData = await captureRes.json();

        if (captureData.status === 'COMPLETED') {
            await supabase.from('sweepstake_bets').update({
                payment_status: 'paid',
                payment_method: 'paypal',
                transaction_id: orderId,
                updated_at: new Date().toISOString()
            }).eq('id', betId);
        }
        return res.status(200).json(captureData);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
