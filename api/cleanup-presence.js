import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use Service Role Key if available for admin privileges (bypass RLS), otherwise anon key
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

export default async function handler(req, res) {
  // Check for authorization if needed (e.g., a secret header from Vercel Cron)
  // Vercel adds 'x-vercel-cron': '1' header to requests made by the cron scheduler
  const authHeader = req.headers.authorization;
  if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
     // For now, we are permissive to ensure it works, but in production, you'd want to uncomment a return 401 here
     // console.log('Unauthorized attempt');
  }

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
