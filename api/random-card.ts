import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiResponse = await fetch('https://db.ygoprodeck.com/api/v7/randomcard.php');
    
    if (!apiResponse.ok) {
      // Forward the status from the external API
      return res.status(apiResponse.status).json({ error: 'Failed to fetch card from YGOPRODeck' });
    }
    
    const data = await apiResponse.json();

    // Set cache headers to encourage caching for a day, similar to the staleTime
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
