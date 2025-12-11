import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";

// Import components
import { HeroSection } from "@/components/Hero"; // Re-import HeroSection
import { TournamentHero } from "@/components/TournamentHero";
import { FeaturedDecks } from "@/components/FeaturedDecks";
import { NewsSection } from "@/components/NewsSection";
import { RankingsWidget } from "@/components/RankingsWidget";
import { CardOfTheDay } from "@/components/CardOfTheDay";
import { DiscordWidget } from "@/components/DiscordWidget";
import { ActivityTimeline } from "@/components/ActivityTimeline";

interface IndexProps {
  user: User | null;
  onLogout: () => void;
}

const Index = ({ user, onLogout }: IndexProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* 1. HERO SECTION (Restored to top) */}
      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-2">
        <HeroSection />
      </div>

      {/* Main Grid Container */}
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

          {/* MAIN COLUMN (Left - 70% approx) */}
          <div className="lg:col-span-7 space-y-8">
            {/* A. Banner de Destaque (Tournament Carousel) */}
            <TournamentHero />

            {/* B. Seção de Notícias */}
            <NewsSection />

            {/* C. Decks da Comunidade */}
            <FeaturedDecks />
          </div>

          {/* SIDEBAR (Right - 30% approx) */}
          <div className="lg:col-span-3 space-y-6">
            {/* A. Widget de Rankings (Tabs) */}
            <RankingsWidget />

            {/* B. Card do Dia */}
            <CardOfTheDay />

            {/* C. Widget do Discord */}
            <DiscordWidget />
          </div>
          
        </div>
        {/* D. Atividade Recente */}
        <div className="mt-8">
          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
};

export default Index;