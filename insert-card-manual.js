import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'yugi-forge-arena/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo'; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertCard() {
    const card = {
        id: '99999001', 
        konami_id: '99999001',
        name: 'W:P Fancy Ball',
        pt_name: 'W:P Fancy Ball',
        type: 'Link Monster',
        description: `2+ Effect Monsters

You can only use each effect of "W:P Fancy Ball" once per turn.
(Quick Effect): You can banish this card that was Special Summoned this turn until the End Phase; negate the activation of your opponent's monster effect on the field or in the GY, and if you do, banish that card.
During your opponent's Main Phase (Quick Effect): Immediately after this effect resolves, Link Summon 1 Link Monster using this card you control as material. If you do, you can also use 1 Link-2 or lower Link Monster your opponent controls as material. Neither player can activate the effects of Link Monsters in response to this effect's activation.`,
        race: 'Cyberse',
        attribute: 'DARK',
        atk: 2400,
        def: null,
        level: null,
        image_url: 'https://images.yugipedia.com/thumb/a/a2/WPFancyBall-MD.png/400px-WPFancyBall-MD.png',
        image_url_small: 'https://images.yugipedia.com/thumb/a/a2/WPFancyBall-MD.png/200px-WPFancyBall-MD.png',
        ban_master_duel: null,
        genesys_points: 0,
        md_rarity: 'Ultra Rare'
    };

    console.log('Inserting card W:P Fancy Ball...');
    const { error } = await supabase.from('cards').upsert(card);

    if (error) {
        console.error('Error inserting card:', error);
    } else {
        console.log('Card inserted successfully!');
    }
}

insertCard();