import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    // 1. Container Relativo com altura definida (ex: 60% da tela)
    // 2. Background (imagem) e overlay (pseudo-elemento ::before)
    <div
      className="relative flex items-center justify-center w-full h-auto md:h-[37.8vh] min-h-[150px] py-4 md:py-0 overflow-hidden rounded-lg"
    >
      {/* Desktop Background Image */}
      <div 
        className="hidden md:block absolute inset-0 w-full h-full" 
        style={{
          backgroundImage: "url('/hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Mobile Background Image */}
      <div 
        className="block md:hidden absolute inset-0 w-full h-full" 
        style={{
          backgroundImage: "url('/hero-bg-mobile.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Overlay escuro para legibilidade */}
      <div className="absolute inset-0 w-full h-full bg-black/60 z-10" />

      {/* Conteúdo (em cima do overlay) */}
      <div className="relative z-20 flex flex-col items-center text-center text-white p-4">
        
        {/* ***** MUDANÇA DE NOME AQUI ***** */}
        <h1 className="text-2xl md:text-5xl lg:text-7xl font-bold text-white" 
          style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
          STAFF
        </h1>
        
        <p className="mt-1 text-sm md:text-xl text-neutral-200">
          Seu hub completo para Yu-Gi-Oh!<br />
          Crie decks, entre em torneios e chegue ao topo do ranking.
        </p>

        {/* Botões */}
        <div className="flex gap-2 mt-4">
          <Button asChild className="bg-primary hover:bg-primary/90 text-xs px-3 py-1 md:text-base md:px-8 md:py-2.5">
            <Link to="/deck-builder">Criar um Deck</Link>
          </Button>
          <Button asChild variant="secondary" className="text-xs px-3 py-1 md:text-base md:px-8 md:py-2.5">
            <Link to="/tournaments">Ver Torneios</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
