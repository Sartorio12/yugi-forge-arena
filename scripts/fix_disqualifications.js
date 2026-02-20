
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://api.staffygo.com.br';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const supabase = createClient(supabaseUrl, supabaseKey);

const tournamentId = 33;
const userIds = [
  'fa97f0c9-3c9e-46ba-a24e-edbb6b62548e',
  'bcf4388f-7445-486c-8fb5-596af677d3e2',
  'e8a6762a-f971-44ac-9208-4cde472c82ee',
  '7a86e434-39db-4f3c-a68b-104ffd2adf43',
  '716f9f8d-2fd3-42fc-8161-82107d843987'
];

async function run() {
  console.log(`Iniciando processamento para o Torneio ${tournamentId}...`);

  // 1. Marcar participantes como desclassificados
  console.log('1. Atualizando status de desclassificação...');
  const { error: partError } = await supabase
    .from('tournament_participants')
    .update({ is_disqualified: true })
    .eq('tournament_id', tournamentId)
    .in('user_id', userIds);

  if (partError) {
    console.error('Erro ao atualizar participantes:', partError);
    return;
  }
  console.log('   Participantes marcados como desclassificados.');

  // 2. Resetar partidas de W.O. envolvendo esses jogadores
  console.log('2. Resetando partidas de W.O. (apenas as marcadas como W.O.)...');
  
  // Primeiro, buscamos as partidas para confirmar quantas serão afetadas
  const { data: matches, error: fetchError } = await supabase
    .from('tournament_matches')
    .select('id, player1_id, player2_id')
    .eq('tournament_id', tournamentId)
    .eq('is_wo', true)
    .or(`player1_id.in.(${userIds.join(',')}),player2_id.in.(${userIds.join(',')})`);

  if (fetchError) {
    console.error('Erro ao buscar partidas:', fetchError);
    return;
  }

  console.log(`   Encontradas ${matches.length} partidas de W.O. para resetar.`);

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
      console.log('   Partidas resetadas com sucesso.');
    }
  } else {
    console.log('   Nenhuma partida de W.O. encontrada para resetar.');
  }

  console.log('Processo concluído.');
}

run();
