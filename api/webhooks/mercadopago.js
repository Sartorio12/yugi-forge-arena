import { MERCADOPAGO_CONFIG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../config.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { action, data } = req.body;

  try {
    if (action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data.id;

      // Fetch payment status from Mercado Pago
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_CONFIG.ACCESS_TOKEN}`
        }
      });
      
      if (!response.ok) {
          throw new Error('Failed to fetch payment info from MP');
      }

      const payment = await response.json();
      const betId = payment.external_reference;

      if (payment.status === 'approved' && betId) {
        // Update database
        await supabase.from('sweepstake_bets').update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
        }).eq('id', betId);
        
        console.log(`Bet ${betId} paid via Pix.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).end();
  }
}
