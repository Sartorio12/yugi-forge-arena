const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// CONFIGURAÇÃO CLOUD (FONTE)
const cloudUrl = 'https://mggwlfbajeqbdgkflmqi.supabase.co';
const cloudKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nZ3dsZmJhamVxYmRna2ZsbXFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM2NjUxNSwiZXhwIjoyMDc3OTQyNTE1fQ.Ux21IMzLIAwYjpDtNdQtNpxeKMeVtjzoN17pgMmPhUo';
const cloudSupabase = createClient(cloudUrl, cloudKey);

// CONFIGURAÇÃO LOCAL (DESTINO)
const localUrl = 'https://api.staffygo.com.br';
const localKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const localSupabase = createClient(localUrl, localKey);

const BUCKETS = ['tournament_banners', 'profiles', 'news_content'];

async function syncFile(bucket, filePath) {
    console.log(`  Sincronizando: ${bucket}/${filePath}`);
    
    const { data, error: dlError } = await cloudSupabase.storage.from(bucket).download(filePath);
    if (dlError) {
        console.error(`    [ERRO CLOUD] Download falhou: ${filePath}`, dlError.message);
        return;
    }

    const { error: upError } = await localSupabase.storage.from(bucket).upload(filePath, data, {
        upsert: true,
        contentType: data.type // Preserva o mimetype original (GIF, PNG, etc)
    });

    if (upError) {
        console.error(`    [ERRO LOCAL] Upload falhou: ${filePath}`, upError.message);
    } else {
        console.log(`    [OK] Sucesso!`);
    }
}

async function listAndSync(bucket, prefix = '') {
    const { data: files, error } = await cloudSupabase.storage.from(bucket).list(prefix);

    if (error) {
        console.error(`Erro ao listar ${bucket}:`, error.message);
        return;
    }

    for (const file of files) {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
        if (file.id === null) {
            await listAndSync(bucket, fullPath);
        } else {
            await syncFile(bucket, fullPath);
        }
    }
}

async function start() {
    console.log('--- INICIANDO SINCRONIZAÇÃO CLOUD -> LOCAL ---');
    for (const bucket of BUCKETS) {
        await listAndSync(bucket);
    }
    console.log('--- SINCRONIZAÇÃO FINALIZADA ---');
}

start();
