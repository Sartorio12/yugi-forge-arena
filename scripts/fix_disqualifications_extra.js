
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.staffygo.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const supabase = createClient(supabaseUrl, supabaseKey);

const tournamentId = 33;
const userIds = [
  'ab5554c3-0951-42b1-9326-d2826a86b67a'
];

async function run() {
  console.log(`Iniciando processamento extra para o Torneio ${tournamentId}...`);

  // 1. Marcar participante como desclassificado
  const { error: partError } = await supabase
    .from('tournament_participants')
    .update({ is_disqualified: true })
    .eq('tournament_id', tournamentId)
    .in('user_id', userIds);

  if (partError) {
    console.error('Erro ao atualizar participante:', partError);
    return;
  }
  console.log('   Participante marcado como desclassificado.');

  // 2. Resetar partidas de W.O. envolvendo esse jogador
  const { data: matches, error: fetchError } = await supabase
    .from('tournament_matches')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('is_wo', true)
    .or(`player1_id.in.(${userIds.join(',')}),player2_id.in.(${userIds.join(',')})`);

  if (fetchError) {
    console.error('Erro ao buscar partidas:', fetchError);
    return;
  }

  if (matches.length > 0) {
    const matchIds = matches.map(m => m.id);
    const { error: matchError } = await supabase
      .from('tournament_matches')
      .update({
        winner_id: null,
        is_wo: false
      })
      .in('id', matchIds);

    if (matchError) {
      console.error('Erro ao resetar partidas:', matchError);
    } else {
      console.log(`   ${matches.length} partidas de W.O. resetadas com sucesso.`);
    }
  } else {
    console.log('   Nenhuma partida de W.O. encontrada para este usuário.');
  }

  console.log('Processo concluído.');
}

run();
