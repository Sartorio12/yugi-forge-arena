
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testTeamConstraint() {
  // Get a user who is NOT in the tournament
  const { data: participants } = await supabase.from('tournament_participants').select('user_id').eq('tournament_id', 33);
  const participantIds = participants.map(p => p.user_id);
  
  const { data: users } = await supabase.from('profiles').select('id').limit(10);
  const testUser = users.find(u => !participantIds.includes(u.id));
  
  if (!testUser) {
    console.log('No test user found.');
    return;
  }
  
  console.log('Testing with user:', testUser.id);
  
  const { error: insertError } = await supabase
    .from('tournament_participants')
    .insert({
        tournament_id: 33,
        user_id: testUser.id,
        team_selection: 'Liverpool' // already taken
    });
    
  if (insertError) {
    console.log('Insert failed:', insertError);
  } else {
    console.log('Insert succeeded! No unique constraint on (tournament_id, team_selection).');
    // Cleanup
    await supabase.from('tournament_participants').delete().eq('user_id', testUser.id).eq('tournament_id', 33);
  }
}

testTeamConstraint();
