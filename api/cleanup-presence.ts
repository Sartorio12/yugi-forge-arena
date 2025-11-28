import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Needed for admin tasks if RLS is strict

// Note: For this specific task, we might need the SERVICE_ROLE_KEY if the function needs admin privileges
// or if we are calling it from a context without a user session.
// However, the function `cleanup_inactive_users` is SECURITY DEFINER, so it runs as the owner (postgres/admin).
// We just need to be able to call the RPC.
// If RLS on profiles prevents UPDATE, the SECURITY DEFINER inside the function overrides it.

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use Service Role Key for Cron Jobs to bypass RLS authentication requirements
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
