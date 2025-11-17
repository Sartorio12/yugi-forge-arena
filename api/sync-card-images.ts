import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';

const supabaseUrl = process.env.SUPABASE_URL;
// IMPORTANT: Use the Service Role Key to bypass RLS for admin tasks.
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase URL or Service Role Key is missing.");
}

// Initialize the Supabase client with the service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: Request, res: Response) {
  try {
    // 1. Get all card IDs from the public.cards table
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('id');

    if (cardsError) {
      throw cardsError;
    }

    const cardIds = new Set(cards.map(card => card.id.toString()));

    // 2. List all files in the card_images bucket
    const { data: existingImages, error: listError } = await supabase
      .storage
      .from('card_images')
      .list();

    if (listError) {
      throw listError;
    }

    const existingImageIds = new Set(existingImages.map(file => file.name.replace('.jpg', '')));

    // 3. Determine which card IDs are missing images
    const missingCardIds = [...cardIds].filter(id => !existingImageIds.has(id));

    if (missingCardIds.length === 0) {
      return res.status(200).json({ message: 'All card images are up to date.' });
    }

    let uploadedCount = 0;
    let failedCount = 0;

    // 4. For each missing image, fetch and upload
    for (const cardId of missingCardIds) {
      try {
        const imageUrl = `https://images.ygoprodeck.com/images/cards/${cardId}.jpg`;
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          console.warn(`Failed to fetch image for card ID ${cardId}. Status: ${imageResponse.status}`);
          failedCount++;
          continue;
        }

        const imageBuffer = await imageResponse.arrayBuffer();

        const { error: uploadError } = await supabase
          .storage
          .from('card_images')
          .upload(`${cardId}.jpg`, imageBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Failed to upload image for card ID ${cardId}:`, uploadError);
          failedCount++;
        } else {
          uploadedCount++;
        }
      } catch (e) {
        console.error(`An error occurred while processing card ID ${cardId}:`, e);
        failedCount++;
      }
    }

    res.status(200).json({
      message: 'Card image synchronization complete.',
      uploaded: uploadedCount,
      failed: failedCount,
      totalMissing: missingCardIds.length,
    });

  } catch (error) {
    console.error('Error syncing card images:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    res.status(500).json({ error: 'Failed to sync card images.', details: errorMessage });
  }
}
