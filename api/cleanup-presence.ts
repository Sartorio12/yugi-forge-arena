import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use Service Role Key for Cron Jobs to bypass RLS authentication requirements
// Fallback to anon key if service key is missing (though less secure/capable)
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Check for authorization if needed (e.g., a secret header from Vercel Cron)
  const authHeader = req.headers.authorization;
  if (req.headers['x-vercel-cron'] !== '1' && (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`)) {
    // Optional: Secure your cron endpoint
    // return res.status(401).json({ error: 'Unauthorized' });
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
