
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.staffygo.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const supabase = createClient(supabaseUrl, supabaseKey);

const tournamentId = 33;

async function run() {
  console.log(`Resetando resultados das partidas para o Torneio ${tournamentId}...`);

  const { error } = await supabase
    .from('tournament_matches')
    .update({
      winner_id: null,
      is_wo: false
    })
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Erro ao resetar partidas:', error);
  } else {
    console.log('Resultados resetados com sucesso.');
  }
}

run();
