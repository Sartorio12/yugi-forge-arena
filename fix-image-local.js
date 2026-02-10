
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'yugi-forge-arena/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo'; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCardImageLocal() {
    const card = {
        image_url: '/cards/wp-fancy-ball.webp',
        image_url_small: '/cards/wp-fancy-ball.webp'
    };

    console.log('Updating card image to local public path...');
    const { error } = await supabase
        .from('cards')
        .update(card)
        .eq('id', '99999001');

    if (error) {
        console.error('Error updating card image:', error);
    } else {
        console.log('Card image updated to local path successfully!');
    }
}

updateCardImageLocal();
