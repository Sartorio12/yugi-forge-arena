import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use Service Role Key if available
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

export default async function handler(req, res) {
  // Allow this to be called by anyone or external cron services (like cron-job.org)
  // You can add a secret check here if you use an external service
  
  try {
    const { error } = await supabase.rpc('cleanup_inactive_users');

    if (error) {
      console.error('Error cleaning up inactive users:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Inactive users cleaned up successfully' });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
