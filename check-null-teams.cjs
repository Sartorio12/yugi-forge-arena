
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNullTeams() {
  const { data: participants, error } = await supabase
    .from('tournament_participants')
    .select('id, user_id, team_selection')
    .eq('tournament_id', 33)
    .is('team_selection', null);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Participants with NULL team:', participants);
}

checkNullTeams();
