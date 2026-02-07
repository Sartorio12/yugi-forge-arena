
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicates() {
  const { data: participants, error } = await supabase
    .from('tournament_participants')
    .select('user_id')
    .eq('tournament_id', 33);
    
  if (error) {
    console.error(error);
    return;
  }
  
  const userIds = participants.map(p => p.user_id).filter(Boolean);
  const uniqueUserIds = new Set(userIds);
  
  console.log('Total participants:', participants.length);
  console.log('Unique user IDs:', uniqueUserIds.size);
  
  if (userIds.length !== uniqueUserIds.size) {
    console.log('DUPLICATE USERS FOUND!');
    const counts = {};
    userIds.forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
    console.log(Object.keys(counts).filter(id => counts[id] > 1));
  }
}

checkDuplicates();
