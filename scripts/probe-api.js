import { createClient } from '@supabase/supabase-js';

async function probeApi() {
    console.log("Probing Cards API Structure...");
    
    // Fetch a list of cards
    const url = "https://www.masterduelmeta.com/api/v1/cards?limit=2";
    console.log(`Fetching ${url}`);
    
    try {
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            console.log("API Sample Data (First item):");
            console.log(JSON.stringify(data[0], null, 2));
        } else {
            console.log(`API Probe Failed: ${res.status}`);
        }
    } catch (e) {
        console.error(e);
    }
}

async function runTest() {
    await probeApi();
}

runTest();
