import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/random-card': {
        target: 'https://db.ygoprodeck.com/api/v7/randomcard.php',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/random-card/, ''),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/navigation": "react-router-dom",
    },
  },
}));
