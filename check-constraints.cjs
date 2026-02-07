
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
  const { data, error } = await supabase.rpc('get_table_constraints', { p_table_name: 'tournament_participants' });

  if (error) {
    // If the RPC doesn't exist, we can try to query information_schema if we have permissions, 
    // but usually we don't. 
    // Let's try to just insert a duplicate team to see if it fails.
    console.log('RPC get_table_constraints failed or not found. Testing with a manual insert...');
    
    // We try to insert a fake participation with a team that is already taken.
    // Use a random UUID to avoid user_id conflict.
    const fakeUserId = '00000000-0000-0000-0000-000000000000'; 
    const { error: insertError } = await supabase
        .from('tournament_participants')
        .insert({
            tournament_id: 33,
            user_id: fakeUserId,
            team_selection: 'Liverpool' // already taken
        });
        
    if (insertError) {
        console.log('Insert failed (as expected if there is a constraint):', insertError);
    } else {
        console.log('Insert succeeded! No unique constraint on team_selection.');
        // Cleanup
        await supabase.from('tournament_participants').delete().eq('user_id', fakeUserId).eq('tournament_id', 33);
    }
    return;
  }

  console.log('Constraints:', data);
}

checkConstraints();
