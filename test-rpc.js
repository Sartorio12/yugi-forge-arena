import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './api/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testRpc() {
  console.log("Testing RPC...");
  const { data, error } = await supabase.rpc('get_tournament_power_rankings', { p_tournament_id: 35 });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Success:", data);
  }
}

testRpc();
