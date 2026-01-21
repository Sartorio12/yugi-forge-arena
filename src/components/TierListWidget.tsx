import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";

interface TierDeck {
  id: number;
  deck_name: string;
  tier: number;
  image_url?: string;
  power_score?: number;
}

// Componente auxiliar para imagem do deck
const DeckThumbnail = ({ deckName, initialUrl }: { deckName: string, initialUrl?: string | null }) => {
  const { data: imageUrl, isLoading } = useQuery({
    queryKey: ['deck-image', deckName, initialUrl],
    queryFn: async () => {
      if (initialUrl) return initialUrl;
      
      // Fallback: Tenta encontrar no banco de cartas
      // Remove caracteres especiais exceto hífens (ex: Blue-Eyes)
      const searchTerm = deckName.replace(/[^\w\s-]/gi, '').trim();
      
      if (!searchTerm) return "/placeholder.svg";

      const { data } = await supabase
        .from('cards')
        .select('image_url') 
        .ilike('name', `%${searchTerm}%`)
        .limit(1)
        .maybeSingle();
        
      return data?.image_url || "/placeholder.svg";
    },
    staleTime: 1000 * 60 * 60 * 24, 
  });

  const isExternal = !!initialUrl;

  if (isLoading) {
    return <div className="w-full h-full bg-muted animate-pulse" />;
  }

  return (
    <div className="w-full h-full overflow-hidden relative">
      <img 
        src={imageUrl || "/placeholder.svg"} 
        alt={deckName} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        style={isExternal ? {} : { 
            // Zoom apenas para fallback de cartas completas do banco
            objectPosition: 'center 20%', 
            transform: 'scale(1.3)'       
        }} 
        loading="lazy"
      />
    </div>
  );
};

export function TierListWidget() {
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["tier-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_list")
        .select("*")
        .order("tier", { ascending: true })
        // Garante que decks com score apareçam antes dos sem score
        .order("power_score", { ascending: false, nullsFirst: false }) 
        .order("deck_name", { ascending: true });
      
      if (error) throw error;
      return data as TierDeck[];
    },
  });

  if (isLoading) {
    return null;
  }

  if (!tiers || tiers.length === 0) {
    return null;
  }

  const tier1 = tiers.filter((d) => d.tier === 1);
  const tier2 = tiers.filter((d) => d.tier === 2);
  const tier3 = tiers.filter((d) => d.tier === 3).slice(0, 3); // Apenas top 3

  const CompactDeckCard = ({ deck, rankColor }: { deck: TierDeck, rankColor: string }) => (
    <Link to={`/meta/${encodeURIComponent(deck.deck_name)}`} className="block group">
      <div 
        className="relative aspect-square overflow-hidden rounded-sm border border-border/50 shadow-sm bg-black/80 hover:ring-2 ring-primary/50 transition-all cursor-pointer"
        title={`${deck.deck_name} (Power: ${deck.power_score || 'N/A'})`}
      >
        <DeckThumbnail deckName={deck.deck_name} initialUrl={deck.image_url} />
        
        {/* Dark Gradient Overlay for readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />

        {/* Power Score Badge (Top Left) */}
        {deck.power_score !== undefined && deck.power_score !== null && (
          <div className="absolute top-1 left-1 z-10">
             <div className="bg-black/60 backdrop-blur-[2px] text-[9px] font-bold px-1.5 py-0.5 rounded-sm text-white flex items-center gap-0.5 border border-white/10 shadow-sm">
                <span className="text-yellow-400">⚡</span> {deck.power_score}
             </div>
          </div>
        )}

        {/* Tier Badge (Top Right) */}
        <div className="absolute top-1 right-1 z-10">
           <div className={`${rankColor} shadow-md text-[10px] font-bold px-1.5 py-0.5 rounded-sm leading-none text-white`}>
              T{deck.tier}
           </div>
        </div>

        {/* Deck Name */}
        <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center">
          <p className="text-white font-bold text-[10px] sm:text-xs leading-tight line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {deck.deck_name}
          </p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="rounded-lg border bg-card/50 backdrop-blur-sm overflow-hidden">
      <div className="px-3 py-2 border-b bg-muted/20 flex justify-between items-center">
         <h3 className="font-bold text-sm uppercase flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Meta
         </h3>
         <span className="text-[10px] text-muted-foreground">MDM</span>
      </div>
      
      <div className="p-3 grid gap-4">
        {/* Tier 1 */}
        {tier1.length > 0 && (
          <div className="flex flex-col gap-1.5">
             <span className="text-[10px] font-bold text-red-500 uppercase">Tier 1</span>
             <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
               {tier1.map(deck => (
                 <CompactDeckCard key={deck.id} deck={deck} rankColor="bg-red-600" />
               ))}
             </div>
          </div>
        )}

        {/* Tier 2 */}
        {tier2.length > 0 && (
          <div className="flex flex-col gap-1.5">
             <span className="text-[10px] font-bold text-orange-500 uppercase">Tier 2</span>
             <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
               {tier2.map(deck => (
                 <CompactDeckCard key={deck.id} deck={deck} rankColor="bg-orange-600" />
               ))}
             </div>
          </div>
        )}

        {/* Tier 3 */}
        {tier3.length > 0 && (
          <div className="flex flex-col gap-1.5">
             <span className="text-[10px] font-bold text-yellow-500 uppercase">Tier 3 (Top 3)</span>
             <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
               {tier3.map(deck => (
                 <CompactDeckCard key={deck.id} deck={deck} rankColor="bg-yellow-600" />
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
