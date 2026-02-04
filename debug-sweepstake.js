import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './api/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debugSweepstake() {
  console.log("--- DEBUG BOLÃO ---");
  
  // 1. Verificar Bolões
  const { data: sws } = await supabase.from('sweepstakes').select('id, title, is_active');
  console.log("Bolões encontrados:", sws);

  if (sws && sws.length > 0) {
      const swId = sws[0].id;
      // 2. Verificar Apostas para o primeiro bolão
      const { data: bets } = await supabase
        .from('sweepstake_bets')
        .select('id, user_id, payment_status, sweepstake_id')
        .eq('sweepstake_id', swId);
      
      console.log(`Apostas no bolão ID ${swId}:`, bets);
  }
}

debugSweepstake();
