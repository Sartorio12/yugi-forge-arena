
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY1MTUsImV4cCI6MjA3Nzk0MjUxNX0.f_2YZ8JIPhAYfL7I0Uvjdqg9qeUjRj8NuVaHBt0mprQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkParticipants() {
  console.log("Checking participants for Tournament 29...");

  // Check if we have deck_id in participants
  const { data, error } = await supabase
    .from('tournament_participants')
    .select('user_id, deck_id')
    .eq('tournament_id', 29)
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Participants sample:", data);
  }
}

checkParticipants();
