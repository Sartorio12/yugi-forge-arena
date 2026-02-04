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

  const { betId } = req.body;

  if (!betId) {
      return res.status(400).json({ error: 'Missing betId' });
  }

  try {
      // 1. Get transaction_id from DB
      const { data: bet, error } = await supabase
        .from('sweepstake_bets')
        .select('transaction_id, payment_status')
        .eq('id', betId)
        .single();

      if (error || !bet) {
          return res.status(404).json({ error: 'Bet not found' });
      }

      // If already paid, just return success
      if (bet.payment_status === 'paid') {
          return res.json({ status: 'paid' });
      }

      if (!bet.transaction_id) {
          return res.status(400).json({ error: 'No transaction linked to this bet' });
      }

      // 2. Check Mercado Pago API by External Reference (Bet ID)
      // This is more robust because it finds ANY payment for this bet, even if transaction_id was overwritten locally
      const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${betId.toString()}&status=approved`;
      
      const searchResponse = await fetch(searchUrl, {
          headers: {
            Authorization: `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}`
          }
      });

      const searchData = await searchResponse.json();
      
      if (!searchResponse.ok) {
          console.error("MP Search Error:", searchData);
          return res.status(500).json({ error: 'Failed to search payment status' });
      }

      // Check if we found ANY approved payment
      if (searchData.results && searchData.results.length > 0) {
          const approvedPayment = searchData.results[0];
          
          await supabase.from('sweepstake_bets').update({
              payment_status: 'paid',
              payment_method: 'mercadopago', // Ensure this is set
              transaction_id: approvedPayment.id.toString(), // Update to the winning ID
              updated_at: new Date().toISOString()
          }).eq('id', betId);
          
          return res.json({ status: 'paid' });
      }

      // Fallback: Check the specific transaction_id if it exists (for pending status msg)
      if (bet.transaction_id) {
          const response = await fetch(`https://api.mercadopago.com/v1/payments/${bet.transaction_id}`, {
              headers: { Authorization: `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}` }
          });
          if (response.ok) {
              const data = await response.json();
              if (data.status === 'approved') {
                   // Should have been caught by search, but just in case
                   await supabase.from('sweepstake_bets').update({
                      payment_status: 'paid',
                      updated_at: new Date().toISOString()
                  }).eq('id', betId);
                  return res.json({ status: 'paid' });
              }
              return res.json({ status: data.status });
          }
      }

      return res.json({ status: 'pending' });

  } catch (error) {
      console.error("Server Error:", error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
}
