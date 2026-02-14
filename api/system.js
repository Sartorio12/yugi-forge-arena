import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY } from './config.js';
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
      await supabase.from('profiles').update({ blocked_until: null }).lt('blocked_until', new Date().toISOString());
      return res.status(200).json({ success: true });
    }

    // ACTION: GET YOUTUBE LIVE
    if (action === 'get-youtube-live') {
      const { channelId } = req.query;
      if (!channelId) return res.status(400).json({ error: 'Missing channelId' });
      
      let videoId = null;

      // 1. Try Official API (Most reliable for Vercel/Production)
      if (YOUTUBE_API_KEY) {
        try {
          const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${YOUTUBE_API_KEY}`;
          const apiRes = await fetch(apiUrl);
          const apiData = await apiRes.json();
          
          if (apiData.items && apiData.items.length > 0) {
            videoId = apiData.items[0].id.videoId;
          }
        } catch (apiErr) {
          console.error("YouTube API Error:", apiErr);
        }
      }

      // 2. Fallback to Scraping (If API failed or Key missing)
      if (!videoId) {
        const response = await fetch(`https://www.youtube.com/channel/${channelId}/live`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        const text = await response.text();
        const canonicalMatch = text.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([^"]+)">/);
        videoId = canonicalMatch ? canonicalMatch[1] : null;
      }

      return res.status(200).json({ videoId });
    }

    // ACTION: FETCH CHALLONGE
    if (action === 'fetch-challonge') {
        return res.status(200).json({ message: "Challonge sync not implemented" });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
