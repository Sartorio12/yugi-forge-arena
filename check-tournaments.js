import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './api/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkTournaments() {
  console.log("Checking tournaments with Service Role Key (Bypassing RLS)...");
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, title, created_at');

  if (error) {
    console.error("Error fetching tournaments:", error);
  } else {
    console.log(`Found ${data.length} tournaments:`);
    console.table(data);
  }
}

checkTournaments();
