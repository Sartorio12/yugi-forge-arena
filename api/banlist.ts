import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (request: VercelRequest, response: VercelResponse) {
  try {
    const apiResponse = await fetch('https://db.ygoprodeck.com/api/v7/banlist.php?format=tcg');
    if (!apiResponse.ok) {
      throw new Error(`API responded with status ${apiResponse.status}`);
    }
    const data = await apiResponse.json();
    response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching banlist:', error);
    response.status(500).json({ error: 'Failed to fetch banlist', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
