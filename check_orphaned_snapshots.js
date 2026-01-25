
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY1MTUsImV4cCI6MjA3Nzk0MjUxNX0.f_2YZ8JIPhAYfL7I0Uvjdqg9qeUjRj8NuVaHBt0mprQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrphanedSnapshots() {
  console.log("Checking orphaned snapshots...");

  // Get participants of T29 to filter snapshots by user
  const { data: participants } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', 29);

  const participantIds = participants.map(p => p.user_id);
  console.log(`Tournament 29 has ${participantIds.length} participants.`);

  if (participantIds.length === 0) return;

  // Find snapshots for these users that have NO tournament_id
  const { data: snapshots, error } = await supabase
      .from('tournament_deck_snapshots')
      .select('id, deck_name, created_at, user_id')
      .is('tournament_id', null)
      .in('user_id', participantIds)
      .order('created_at', { ascending: false });

  if (error) {
      console.error("Error fetching snapshots:", error);
      return;
  }

  console.log(`Found ${snapshots.length} potential orphaned snapshots.`);
  snapshots.slice(0, 10).forEach(s => {
      console.log(`- [${s.id}] ${s.deck_name} (User: ${s.user_id}, Created: ${s.created_at})`);
  });
}

checkOrphanedSnapshots();
