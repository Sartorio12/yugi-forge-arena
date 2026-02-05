import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Handle Chunk Load Errors (Automatic Refresh after Deploy)
window.addEventListener('error', (e) => {
  if (e.message.includes('Failed to fetch dynamically imported module') || 
      e.message.includes('Importing a module script failed')) {
    console.log('Nova versão detectada ou erro de carregamento. Recarregando...');
    window.location.reload();
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
