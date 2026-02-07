
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

async function validateTeams() {
  const { data: participants, error } = await supabase
    .from('tournament_participants')
    .select('id, team_selection')
    .eq('tournament_id', 33);
    
  if (error) {
    console.error(error);
    return;
  }
  
  const invalidTeams = participants.filter(p => p.team_selection && !FOOTBALL_TEAMS.includes(p.team_selection));
  
  if (invalidTeams.length > 0) {
    console.log('INVALID TEAMS FOUND:', invalidTeams);
  } else {
    console.log('All teams are valid.');
  }
}

validateTeams();
