
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

const FOOTBALL_TEAMS = [
  "Liverpool", "Tottenham", "Chelsea", "Manchester City", "Manchester United", "Arsenal",
  "Barcelona", "Real Madrid", "Atlético Madrid",
  "Bayern Munique", "Borussia Dortmund",
  "Ajax", "PSV",
  "Porto", "Benfica", "Sporting",
  "Celtic", "Rangers",
  "PSG", "Lyon", "Olympique Marseille",
  "Galatasaray", "Fenerbahçe",
  "Olympiacos",
  "Brugge",
  "Inter de Milão", "Milan", "Juventus", "Napoli", "Atalanta", "Fiorentina",
  "Sevilla"
];

async function debugParticipants() {
  const { data: participants, error } = await supabase
    .from('tournament_participants')
    .select('id, user_id, team_selection')
    .eq('tournament_id', 33);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log('Total participants:', participants.length);
  
  const teamsTaken = participants.map(p => p.team_selection);
  const available = FOOTBALL_TEAMS.filter(t => !teamsTaken.includes(t));
  
  console.log('Available teams:', available);
  
  // Check for duplicates in DB
  const counts = {};
  participants.forEach(p => {
    if (p.team_selection) {
        counts[p.team_selection] = (counts[p.team_selection] || 0) + 1;
    }
  });
  
  const duplicates = Object.keys(counts).filter(t => counts[t] > 1);
  if (duplicates.length > 0) {
    console.log('DUPLICATE TEAMS DETECTED:', duplicates.map(t => `${t}: ${counts[t]}`));
  } else {
    console.log('No duplicate teams in DB.');
  }
}

debugParticipants();
