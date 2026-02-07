
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBlockedUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, blocked_until, consecutive_misses')
    .not('blocked_until', 'is', null);
    
  if (error) {
    console.error(error);
    return;
  }
  
  const now = new Date();
  const actuallyBlocked = data.filter(u => new Date(u.blocked_until) > now);
  
  console.log('Users with block history:', data.length);
  console.log('Currently blocked users:', actuallyBlocked);
}

checkBlockedUsers();
