async function test() {
    const key = "AIzaSyB_rP30kM1ACRMsBVwHf0DK1O44bosmvYA";
    // Tentar acessar o modelo v1 PRO (não 1.5, não flash)
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: "Responda apenas 'SIM'." }] }]
        })
    });
    
    const data = await response.json();
    if (data.candidates) {
        console.log("SUCESSO:", data.candidates[0].content.parts[0].text);
    } else {
        console.log("FALHA:", JSON.stringify(data, null, 2));
    }
}

test();