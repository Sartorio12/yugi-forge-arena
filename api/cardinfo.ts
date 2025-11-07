import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (request: VercelRequest, response: VercelResponse) {
  try {
    const { query } = request;
    const queryString = new URLSearchParams(query as Record<string, string>).toString();
    const apiUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?${queryString}`;

    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(`API responded with status ${apiResponse.status}`);
    }
    const data = await apiResponse.json();
    response.status(200).json(data);
  } catch (error) {
    console.error('Error fetching cardinfo:', error);
    response.status(500).json({ error: 'Failed to fetch cardinfo', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}
