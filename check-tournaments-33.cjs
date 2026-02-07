
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournament() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, title, status, type, is_private')
    .eq('id', 33)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    return;
  }

  console.log('Tournament details:', data);
  
  const { data: participants, error: pError } = await supabase
    .from('tournament_participants')
    .select('user_id, team_selection')
    .eq('tournament_id', 33);
    
  if (pError) {
    console.error('Error fetching participants:', pError);
    return;
  }
  
  console.log('Participants count:', participants.length);
  console.log('Teams taken:', participants.map(p => p.team_selection).filter(Boolean));
}

checkTournament();
