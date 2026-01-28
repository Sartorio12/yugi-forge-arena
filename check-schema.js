import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    console.log("Verificando estrutura de 'news_posts'...");
    
    const { data: posts, error } = await supabase
        .from('news_posts')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Erro ao ler:", error);
    } else if (posts && posts.length > 0) {
        console.log("Colunas encontradas:");
        console.log(Object.keys(posts[0]));
    } else {
        console.log("Tabela vazia ou sem permissão.");
        // Se estiver vazia, vou tentar inserir com 'content' e ver se dá erro
        testInsert();
    }
}

async function testInsert() {
    console.log("Tentando Insert de Teste...");
    const { error } = await supabase.from('news_posts').insert({
        title: "Teste de Schema",
        content: "<p>Teste</p>", // Assumindo 'content'
        author_id: 'ec2018d3-c57f-42a0-bf15-ebb9a60c8fbd', // MetaBot
        published: false
    });
    
    if (error) {
        console.error("Erro no Insert:", JSON.stringify(error, null, 2));
    } else {
        console.log("Insert funcionou! A coluna é 'content'.");
    }
}

checkSchema();
