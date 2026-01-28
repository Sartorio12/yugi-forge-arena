import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Infelizmente a SDK não tem um método direto simples de listagem sem permissão de admin
        // mas podemos tentar testar o gemini-pro (v1)
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Oi");
        console.log("✅ O modelo 'gemini-pro' funcionou!");
        return "gemini-pro";
    } catch (e) {
        console.log("❌ 'gemini-pro' falhou. Tentando 'gemini-1.5-flash'...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Oi");
            console.log("✅ O modelo 'gemini-1.5-flash' funcionou!");
            return "gemini-1.5-flash";
        } catch (e2) {
             console.log("❌ 'gemini-1.5-flash' falhou também.");
             console.error("Erro detalhado:", e2.message);
        }
    }
    return null;
}

console.log("Testando chaves...");
listModels();
