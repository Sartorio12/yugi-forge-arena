
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllParticipants() {
  const { data: participants, error } = await supabase
    .from('tournament_participants')
    .select('id, team_selection, profiles(username)')
    .eq('tournament_id', 33);
    
  if (error) {
    console.error(error);
    return;
  }
  
  participants.sort((a, b) => (a.team_selection || '').localeCompare(b.team_selection || ''));
  console.log('Participants:', participants.map(p => `${p.team_selection}: ${p.profiles?.username || 'Unknown'}`));
}

listAllParticipants();
