import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'yugi-forge-arena/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo'; // Service Role Key
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournament36() {
    const tournamentId = 36;
    
    // Get participants with IDs
    const { data: participants, error: pError } = await supabase
        .from('tournament_participants')
        .select('id, user_id, total_wins_in_tournament, profiles(username)')
        .eq('tournament_id', tournamentId);
        
    if (pError) {
        console.error('Error fetching participants:', pError);
        return;
    }
    
    console.log(`Tournament ${tournamentId} has ${participants.length} participants.`);
    participants.forEach(p => {
        if (p.total_wins_in_tournament > 0) {
            console.log(`User ${p.profiles?.username || p.user_id}: ${p.total_wins_in_tournament} wins`);
        }
    });
    
    // Check for inconsistencies and fix
    const { count: matchCount, error: mError } = await supabase
        .from('tournament_matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (mError) {
        console.error('Error checking matches:', mError);
        return;
    }

    console.log(`Total matches in DB: ${matchCount}`);

    if (matchCount === 0) {
        console.log('No matches found. Checking for ghost wins...');
        const ghostWinners = participants.filter(p => p.total_wins_in_tournament > 0);
        
        if (ghostWinners.length > 0) {
            console.log(`Found ${ghostWinners.length} participants with ghost wins. Resetting...`);
            for (const p of ghostWinners) {
                const { error } = await supabase
                    .from('tournament_participants')
                    .update({ total_wins_in_tournament: 0 })
                    .eq('id', p.id); 
                
                if (error) console.error(`Failed to reset ${p.profiles?.username}:`, error);
                else console.log(`Reset wins for ${p.profiles?.username}`);
            }
        } else {
            console.log('No ghost wins found.');
        }
    } else {
        console.log("Matches found, skipping ghost win reset.");
    }
}

checkTournament36();