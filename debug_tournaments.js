import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://mggwlfbajeqbdgkflmqi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNjY1MTUsImV4cCI6MjA3Nzk0MjUxNX0.f_2YZ8JIPhAYfL7I0Uvjdqg9qeUjRj8NuVaHBt0mprQ";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTournaments() {
  console.log("Fetching tournaments...");

  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching tournaments:", error);
    return;
  }

  if (data.length > 0) {
      console.log("First tournament columns:", Object.keys(data[0]));
      console.log("Sample:", data[0]);
  } else {
      console.log("No tournaments found.");
  }
}

checkTournaments();