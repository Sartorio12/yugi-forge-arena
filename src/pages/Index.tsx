import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

// Import core components eagerly
import { HeroSection } from "@/components/Hero";
import { BroadcastBar } from "@/components/BroadcastBar";

// Lazy load widgets
const TournamentHero = lazy(() => import("@/components/TournamentHero").then(m => ({ default: m.TournamentHero })));
const ActiveBracketsWidget = lazy(() => import("@/components/ActiveBracketsWidget").then(m => ({ default: m.ActiveBracketsWidget })));
const FeaturedDecks = lazy(() => import("@/components/FeaturedDecks").then(m => ({ default: m.FeaturedDecks })));
const NewsSection = lazy(() => import("@/components/NewsSection").then(m => ({ default: m.NewsSection })));
const RankingsWidget = lazy(() => import("@/components/RankingsWidget").then(m => ({ default: m.RankingsWidget })));
const CardOfTheDay = lazy(() => import("@/components/CardOfTheDay").then(m => ({ default: m.CardOfTheDay })));
const DiscordWidget = lazy(() => import("@/components/DiscordWidget").then(m => ({ default: m.DiscordWidget })));
const ActivityTimeline = lazy(() => import("@/components/ActivityTimeline").then(m => ({ default: m.ActivityTimeline })));
const TierListWidget = lazy(() => import("@/components/TierListWidget").then(m => ({ default: m.TierListWidget })));
const WinStreakWidget = lazy(() => import("@/components/analytics/WinStreakWidget").then(m => ({ default: m.WinStreakWidget })));
const TopRivalriesWidget = lazy(() => import("@/components/analytics/TopRivalriesWidget").then(m => ({ default: m.TopRivalriesWidget })));

interface IndexProps {
  user: User | null;
  onLogout: () => void;
}

const WidgetLoader = () => (
  <div className="flex justify-center py-10 opacity-50">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const Index = ({ user, onLogout }: IndexProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <div className="container mx-auto max-w-7xl px-4 pt-6 pb-2 space-y-6">
        <HeroSection />
        <BroadcastBar />
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

          <div className="lg:col-span-7 space-y-8">
            <Suspense fallback={<WidgetLoader />}>
              <TournamentHero />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <ActiveBracketsWidget />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <TierListWidget />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <NewsSection />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <FeaturedDecks />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <ActivityTimeline />
            </Suspense>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Suspense fallback={<WidgetLoader />}>
              <RankingsWidget />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <div className="space-y-6">
                <WinStreakWidget />
                <TopRivalriesWidget />
              </div>
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <CardOfTheDay />
            </Suspense>

            <Suspense fallback={<WidgetLoader />}>
              <DiscordWidget />
            </Suspense>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Index;