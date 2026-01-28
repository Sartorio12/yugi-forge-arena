async function test() {
    const key = "AIzaSyCVIjt11Y2OPkE6OgGyNJ9hWI6fhWE-MDU";
    // TENTANDO O MODELO GEMMA (QUE É MAIS LEVE)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-2b-it:generateContent?key=${key}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Oi" }] }]
        })
    });
    
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

test();
