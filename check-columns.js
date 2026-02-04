import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './api/config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkProfilesColumns() {
  console.log("Checking profiles columns...");
  // We can't select * from information_schema via API easily without RPC.
  // Instead, let's try to select one row and see keys.
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error:", error);
  } else if (data && data.length > 0) {
    console.log("Columns found:", Object.keys(data[0]));
  } else {
      console.log("No profiles found to check columns.");
  }
}

checkProfilesColumns();
