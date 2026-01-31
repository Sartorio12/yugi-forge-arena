import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TournamentCard from "@/components/TournamentCard";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { Loader2, Filter, Calendar, UserCheck, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TournamentsProps {
  user: User | null;
  onLogout: () => void;
}

const Tournaments = ({ user, onLogout }: TournamentsProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showOld, setShowOld] = useState(false);

  const { data: tournaments, isLoading: isTournamentsLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .is("deleted_at", null)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: participations, isLoading: isParticipationsLoading } = useQuery({
    queryKey: ["user-participations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_participants")
        .select("tournament_id")
        .eq("user_id", user?.id);
      if (error) throw error;
      return data.map(p => p.tournament_id);
    },
  });

  const isLoading = isTournamentsLoading || (activeTab === "my" && isParticipationsLoading);

  const filteredTournaments = tournaments?.filter(tournament => {
    // Filter by tab
    if (activeTab === "open" && tournament.status !== "Aberto") return false;
    if (activeTab === "my" && (!participations || !participations.includes(tournament.id))) return false;

    // Filter by "Old" status
    if (!showOld && tournament.status === "Fechado") {
      const eventDate = new Date(tournament.event_date);
      const now = new Date();
      // Hide if closed and date is older than 2 days
      const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
      if (eventDate < twoDaysAgo) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            {t('tournaments_page.title')}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('tournaments_page.subtitle')}
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-card/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Todos</span>
                <span className="sm:hidden">Todos</span>
              </TabsTrigger>
              <TabsTrigger value="open" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Abertos</span>
                <span className="sm:hidden">Abertos</span>
              </TabsTrigger>
              <TabsTrigger value="my" disabled={!user} className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Inscrito</span>
                <span className="sm:hidden">Inscrito</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center space-x-2 bg-background/50 px-4 py-2 rounded-lg border border-border/50">
            <Label htmlFor="show-old" className="cursor-pointer flex items-center gap-2 text-sm font-medium">
              {showOld ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              Mostrar antigos
            </Label>
            <Switch
              id="show-old"
              checked={showOld}
              onCheckedChange={setShowOld}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTournaments && filteredTournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <TournamentCard
                key={tournament.id}
                id={tournament.id}
                title={tournament.title}
                bannerImageUrl={tournament.banner_image_url}
                eventDate={tournament.event_date}
                status={tournament.status}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-card/30 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground text-lg">
              {activeTab === "my" ? "Você ainda não se inscreveu em nenhum torneio." : t('tournaments_page.no_tournaments')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Tournaments;
