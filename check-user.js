import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_BOT_ID = 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUser() {
    console.log(`Verificando User ID: ${META_BOT_ID}`);

    // 1. Tabela Profiles (Pública)
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', META_BOT_ID);

    console.log("\n--- PERFIL ---");
    if (profile && profile.length > 0) {
        console.log("Perfil encontrado:", profile[0]);
    } else {
        console.log("Perfil NÃO encontrado.", pError);
    }
}

checkUser();
