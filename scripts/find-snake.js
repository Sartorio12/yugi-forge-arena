async function listAll() {
    const url = "https://www.masterduelmeta.com/api/v1/deck-types?limit=1000";
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Total items: ${data.length}`);
    const sample = data.slice(0, 50).map(t => t.name);
    console.log("Sample Names:", sample);
    
    const snakeMatch = data.filter(t => t.name.toLowerCase().includes('snake'));
    console.log("Snake matches:", snakeMatch.map(m => m.name));
}
listAll();