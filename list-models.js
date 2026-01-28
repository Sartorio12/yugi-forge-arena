async function list() {
    const key = "AIzaSyB_rP30kM1ACRMsBVwHf0DK1O44bosmvYA";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Modelos disponíveis para sua NOVA chave:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("Nenhum modelo listado. Erro:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.log("Erro ao listar:", e.message);
    }
}

list();