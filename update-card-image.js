
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'yugi-forge-arena/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo'; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCardImage() {
    // New URLs from Master Duel Meta which are more reliable
    const card = {
        image_url: 'https://www.masterduelmeta.com/api/v1/render/card/W:P%20Fancy%20Ball',
        image_url_small: 'https://www.masterduelmeta.com/api/v1/render/card/W:P%20Fancy%20Ball?width=168'
    };

    console.log('Updating card image for W:P Fancy Ball...');
    const { error } = await supabase
        .from('cards')
        .update(card)
        .eq('id', '99999001');

    if (error) {
        console.error('Error updating card image:', error);
    } else {
        console.log('Card image updated successfully!');
    }
}

updateCardImage();
