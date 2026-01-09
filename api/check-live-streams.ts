import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const twitchClientId = process.env.TWITCH_CLIENT_ID;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(request, response) {
  try {
    // 1. Fetch enabled partners
    const { data: partners, error: partnersError } = await supabase
      .from('stream_partners')
      .select('*')
      .eq('is_enabled', true)
      .order('priority', { ascending: false });

    if (partnersError) throw partnersError;
    if (!partners || partners.length === 0) return response.status(200).json({ message: 'No partners' });

    let liveStream = null;

    // 2. Check TWITCH Partners
    if (twitchClientId && twitchClientSecret) {
      const twitchPartners = partners.filter(p => p.platform === 'twitch');
      if (twitchPartners.length > 0) {
        const tokenResp = await fetch('https://id.twitch.tv/oauth2/token', {
          method: 'POST',
          body: new URLSearchParams({
            client_id: twitchClientId,
            client_secret: twitchClientSecret,
            grant_type: 'client_credentials',
          }),
        });
        const { access_token } = await tokenResp.json();

        const query = new URLSearchParams();
        twitchPartners.forEach(p => query.append('user_login', p.channel_id));
        
        const streamsResp = await fetch(`https://api.twitch.tv/helix/streams?${query.toString()}`, {
          headers: { 'Client-ID': twitchClientId, 'Authorization': `Bearer ${access_token}` },
        });
        const { data: twitchStreams } = await streamsResp.json();

        // Match with priority
        for (const p of twitchPartners) {
          const s = twitchStreams.find(s => s.user_login.toLowerCase() === p.channel_id.toLowerCase());
          if (s) {
            liveStream = { platform: 'twitch', channel_id: s.user_login, title: s.title };
            break; 
          }
        }
      }
    }

    // 3. Check YOUTUBE Partners (If no Twitch partner is live or has lower priority)
    // For YouTube, we check each channel. Note: YouTube API has quotas, so we only check if Twitch didn't find a higher priority live.
    if (!liveStream && youtubeApiKey) {
      const youtubePartners = partners.filter(p => p.platform === 'youtube');
      for (const p of youtubePartners) {
        // Search for active live broadcasts for this channel
        const ytResp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${p.channel_id}&type=video&eventType=live&key=${youtubeApiKey}`
        );
        const ytData = await ytResp.json();
        
        if (ytData.items && ytData.items.length > 0) {
          const video = ytData.items[0];
          liveStream = { 
            platform: 'youtube', 
            channel_id: video.id.videoId, 
            title: video.snippet.title 
          };
          break; // Found one, stop checking (respects priority order from DB)
        }
      }
    }

    // 4. Update Database
    if (liveStream) {
      await supabase.from('broadcasts').update({
        is_active: true,
        platform: liveStream.platform,
        channel_id: liveStream.channel_id,
        title: liveStream.title,
        updated_at: new Date().toISOString()
      }).eq('id', 1);
      
      return response.status(200).json({ status: 'LIVE', ...liveStream });
    } else {
      // Offline: Only turn off if the current broadcast was automated (Twitch/YT)
      const { data: curr } = await supabase.from('broadcasts').select('is_active, platform').eq('id', 1).single();
      if (curr?.is_active) {
        await supabase.from('broadcasts').update({ is_active: false }).eq('id', 1);
      }
      return response.status(200).json({ status: 'OFFLINE' });
    }

  } catch (err: any) {
    return response.status(500).json({ error: err.message });
  }
}