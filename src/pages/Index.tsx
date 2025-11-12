import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";

// Import new components
import { HeroSection } from "@/components/Hero";
import { UpcomingTournaments } from "@/components/UpcomingTournaments";
import { TopRankedPlayers } from "@/components/TopRankedPlayers";
import { FeaturedDecks } from "@/components/FeaturedDecks";
import { NewsSection } from "@/components/NewsSection";
import { ActivityTimeline } from "@/components/ActivityTimeline"; // Import the new component

interface IndexProps {
  user: User | null;
  onLogout: () => void;
}

const Index = ({ user, onLogout }: IndexProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* 1. SEÇÃO HERO (Permanece como está, no topo) */}
      <HeroSection />

      {/* 2. NOVO CONTAINER GRID */}
      <div className="container mx-auto max-w-7xl px-4 py-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* COLUNA DA ESQUERDA (PRINCIPAL) */}
        <div className="lg:col-span-2 space-y-12">
          <UpcomingTournaments />
          <NewsSection />
          <FeaturedDecks />
        </div>

        {/* COLUNA DA DIREITA (BARRA LATERAL) */}
        <div className="lg:col-span-1 space-y-12">
          <TopRankedPlayers />
          <ActivityTimeline /> {/* Add the new component here */}
        </div>
        
      </div>
    </div>
  );
};

export default Index;
