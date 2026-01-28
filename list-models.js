async function list() {
    const key = "AIzaSyCVIjt11Y2OPkE6OgGyNJ9hWI6fhWE-MDU";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Modelos disponíveis:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Erro ao listar:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log("Erro:", e.message);
    }
}

list();
