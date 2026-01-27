import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CustomBanlistProps {
  tournamentId: number;
}

export const CustomBanlist = ({ tournamentId }: CustomBanlistProps) => {
  const { data: bannedCards, isLoading } = useQuery({
    queryKey: ["custom-banlist", tournamentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_tournament_banlist", { p_tournament_id: tournamentId });
      
      if (error) throw error;
      return data;
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
      
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1">
        {bannedCards.map((card) => (
          <div key={card.card_id} className="relative group">
            <Card className="overflow-hidden border-destructive/50 aspect-[2/3] rounded-none">
              <img 
                src={card.image_url_small} 
                alt={card.name} 
                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity rounded-none"
              />
            </Card>
            <p className="text-xs text-center mt-1 truncate font-medium" title={card.name}>
                {card.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
