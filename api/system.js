import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    // ACTION: CLEANUP PRESENCE
    if (action === 'cleanup-presence') {
      const { error } = await supabase.from('profiles').update({ is_online: false }).lt('last_seen', new Date(Date.now() - 10 * 60000).toISOString());
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ACTION: DAILY MAINTENANCE
    if (action === 'daily-maintenance') {
      // 1. Unblock users
      await supabase.from('profiles').update({ blocked_until: null }).lt('blocked_until', new Date().toISOString());
      // 2. Reset daily tournament misses or similar tasks
      return res.status(200).json({ success: true });
    }

    // ACTION: GET YOUTUBE LIVE
    if (action === 'get-youtube-live') {
      const { channelId } = req.query;
      if (!channelId) return res.status(400).json({ error: 'Missing channelId' });
      const response = await fetch(`https://www.youtube.com/channel/${channelId}/live`);
      const text = await response.text();
      const match = text.match(/"videoId":"([^"]+)"/);
      return res.status(200).json({ videoId: match ? match[1] : null });
    }

    // ACTION: FETCH CHALLONGE
    if (action === 'fetch-challonge') {
        const { tournamentId } = req.query;
        // Basic placeholder for challonge fetch logic if needed
        return res.status(200).json({ message: "Challonge sync not implemented in consolidated API yet" });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
