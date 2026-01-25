
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY1MTUsImV4cCI6MjA3Nzk0MjUxNX0.f_2YZ8JIPhAYfL7I0Uvjdqg9qeUjRj8NuVaHBt0mprQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreSnapshots() {
  console.log("Restoring snapshots for Tournament 29...");

  // 1. Get participants
  const { data: participants, error: pError } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', 29);

  if (pError) {
      console.error("Error fetching participants:", pError);
      return;
  }

  const participantIds = participants.map(p => p.user_id);
  console.log(`Found ${participantIds.length} participants.`);

  // 2. Find orphaned snapshots for these users
  // We take the most recent one that has tournament_id = NULL
  const { data: snapshots, error: sError } = await supabase
      .from('tournament_deck_snapshots')
      .select('id, user_id, deck_name')
      .is('tournament_id', null)
      .in('user_id', participantIds)
      .order('created_at', { ascending: false });

  if (sError) {
      console.error("Error fetching snapshots:", sError);
      return;
  }

  // 3. Filter to ensure we only update one per user (the latest one)
  const snapshotsToUpdate = [];
  const processedUsers = new Set();

  for (const snap of snapshots) {
      if (!processedUsers.has(snap.user_id)) {
          snapshotsToUpdate.push(snap.id);
          processedUsers.add(snap.user_id);
          console.log(`Will restore: ${snap.deck_name} (ID: ${snap.id}) for User ${snap.user_id}`);
      }
  }

  if (snapshotsToUpdate.length === 0) {
      console.log("No snapshots found to restore.");
      return;
  }

  // 4. Perform the update
  const { error: uError } = await supabase
      .from('tournament_deck_snapshots')
      .update({ tournament_id: 29 })
      .in('id', snapshotsToUpdate);

  if (uError) {
      console.error("Error updating snapshots:", uError);
  } else {
      console.log(`Successfully restored ${snapshotsToUpdate.length} snapshots to Tournament 29.`);
  }
}

restoreSnapshots();
