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
import { CardOfTheDay } from "@/components/CardOfTheDay";
import { TopRankedClans } from "@/components/TopRankedClans"; // Import the new component
import { DiscordWidget } from "@/components/DiscordWidget";

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
      <div className="container mx-auto max-w-7xl px-4 py-4 mt-3 grid grid-cols-1 lg:grid-cols-3 gap-2">

        {/* COLUNA DA ESQUERDA (PRINCIPAL) */}
        <div className="lg:col-span-2 space-y-3">
          <UpcomingTournaments />
          <NewsSection />
          <ActivityTimeline />
          <FeaturedDecks />
        </div>

        {/* COLUNA DA DIREITA (BARRA LATERAL) */}
        <div className="lg:col-span-1 space-y-3">
          <TopRankedPlayers />
          <TopRankedClans />
          <CardOfTheDay />
          <DiscordWidget />
        </div>
        
      </div>
    </div>
  );
};

export default Index;
