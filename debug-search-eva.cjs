
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = {};
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match) {
                let value = match[2].trim();
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                envVars[match[1].trim()] = value;
            }
        });
        return envVars;
    } catch (e) { return {}; }
}
const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; // Using Anon Key to mimic frontend

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchEva() {
  const searchQuery = "Eva";
  console.log(`Searching for "${searchQuery}" in Supabase...`);

  try {
    const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .or(`name.ilike.%${searchQuery.toLowerCase()}%,pt_name.ilike.%${searchQuery.toLowerCase()}%`)
        .limit(50);

    if (error) {
        console.error("Supabase Error:", error);
        return;
    }

    console.log(`Found ${cards.length} cards.`);
    
    const eva = cards.find(c => c.name === "Eva");
    if (eva) {
        console.log("FOUND Eva in search results!");
        console.log("ID:", eva.id);
        console.log("Name:", eva.name);
    } else {
        console.log("Eva NOT found in the first 50 results.");
        console.log("Results found:");
        cards.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
    }

  } catch (e) {
      console.error("Script Error:", e);
  }
}

searchEva();
