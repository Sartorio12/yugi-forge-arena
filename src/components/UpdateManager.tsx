import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const UpdateManager = () => {
  const location = useLocation();

  const checkForUpdates = async () => {
    if (process.env.NODE_ENV === 'development') return;

    try {
      // Fetch index.html from server without caching
      const response = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
      const html = await response.text();
      
      // Get all script tags from the fetched HTML
      const scripts = Array.from(html.matchAll(/<script.*?src=["'](.*?)["']/g)).map(m => m[1]);
      
      // Check scripts in current document
      const currentScripts = Array.from(document.querySelectorAll('script')).map(s => s.getAttribute('src')).filter(Boolean);

      // If any of the new scripts are not in the current document, it means a new build happened
      const hasNewVersion = scripts.some(src => src && src.startsWith('/assets/') && !currentScripts.includes(src));

      if (hasNewVersion) {
        console.log('Nova versão encontrada! Recarregando...');
        // Small delay to ensure user isn't in the middle of a critical action
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (e) {
      console.error('Falha ao verificar atualizações:', e);
    }
  };

  // Check on every route change
  useEffect(() => {
    checkForUpdates();
  }, [location.pathname]);

  // Also check every 15 minutes
  useEffect(() => {
    const interval = setInterval(checkForUpdates, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null;
};
