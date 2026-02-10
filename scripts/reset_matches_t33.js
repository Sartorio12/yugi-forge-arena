
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

const tournamentId = 33;

async function run() {
  console.log(`Resetando resultados das partidas para o Torneio ${tournamentId}...`);

  // Limpar winner_id, scores e is_wo de todas as partidas do torneio
  const { error } = await supabase
    .from('tournament_matches')
    .update({
      winner_id: null,
      player1_score: 0,
      player2_score: 0,
      is_wo: false
    })
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Erro ao resetar partidas:', error);
  } else {
    console.log('Todas as partidas do torneio 33 foram resetadas (placar zerado, vencedor nulo).');
    console.log('As desclassificações (tabela de participantes) foram mantidas.');
  }
}

run();
