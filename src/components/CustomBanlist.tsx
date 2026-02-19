import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomBanlistProps {
  tournamentId: number;
}

const getCardTypeRank = (type: string, race: string): number => {
  if (type.includes('Fusion') || type.includes('Synchro') || type.includes('XYZ') || type.includes('Link')) return 100;
  if (type.includes("Normal Monster")) return 0;
  if (type.includes("Effect Monster") || type.includes("Flip Effect Monster") || type.includes("Tuner Monster")) return 1;
  if (type.includes("Ritual Monster")) return 2;
  if (type.includes("Pendulum")) return 3;
  if (type.includes("Monster")) return 4;
  if (type === "Spell Card") {
    if (race === "Normal") return 5;
    if (race === "Quick-Play") return 6;
    if (race === "Continuous") return 7;
    return 8;
  }
  if (type === "Trap Card") {
    if (race === "Normal") return 9;
    if (race === "Counter") return 10;
    if (race === "Continuous") return 11;
    return 12;
  }
  return 99;
};

const sortBanlistCards = (cards: any[]): any[] => {
  return [...cards].sort((a, b) => {
    const rankA = getCardTypeRank(a.type, a.race);
    const rankB = getCardTypeRank(b.type, b.race);
    
    if (rankA !== rankB) return rankA - rankB;
    
    // Within the same group, sort by level for monsters
    if (a.type.includes('Monster') && b.type.includes('Monster')) {
      const levelA = a.level ?? 0;
      const levelB = b.level ?? 0;
      if (levelA !== levelB) return levelA - levelB;
    }
    
    // Finally sort alphabetically by name
    return a.name.localeCompare(b.name);
  });
};

export const CustomBanlist = ({ tournamentId }: CustomBanlistProps) => {
  const { data: bannedCards, isLoading } = useQuery({
    queryKey: ["custom-banlist", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_tournament_banlist", { p_tournament_id: tournamentId });
      
      if (error) throw error;
      return sortBanlistCards(data || []);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bannedCards || bannedCards.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">Nenhuma carta banida ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Ban className="h-6 w-6 text-destructive" />
        <h3 className="text-2xl font-bold">Banlist Customizada</h3>
      </div>
      
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
        {bannedCards.map((card) => (
          <div key={card.card_id} className="relative group">
            <Card className="overflow-hidden border-destructive/50 aspect-[2/3] rounded-none">
              <img 
                src={card.image_url_small} 
                alt={card.name} 
                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity rounded-none"
              />
              {card.count > 1 && (
                <Badge 
                    variant="destructive" 
                    className="absolute top-1 right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-[10px] font-bold"
                >
                    {card.count}x
                </Badge>
              )}
            </Card>
            <p className="text-[10px] text-center mt-1 truncate font-medium text-stone-400" title={card.name}>
                {card.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
