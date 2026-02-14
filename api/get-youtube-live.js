
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { channelId } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: 'Channel ID is required' });
  }

  try {
    // YouTube live URL for the channel
    const url = `https://www.youtube.com/channel/${channelId}/live`;
    const response = await fetch(url);
    const text = await response.text();

    // Look for the videoId in the page source
    // Format is usually "videoId":"XXXXXXX"
    const match = text.match(/"videoId":"([^"]+)"/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return res.status(404).json({ error: 'No active live stream found for this channel.' });
    }

    return res.status(200).json({ videoId });
  } catch (error) {
    console.error('Error fetching YouTube live ID:', error);
    return res.status(500).json({ error: 'Failed to fetch live status' });
  }
}
