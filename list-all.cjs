
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://api.staffygo.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
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
