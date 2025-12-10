import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDisplay from "./UserDisplay";
import { Badge } from "@/components/ui/badge";

interface Deck {
  id: number;
  deck_name: string;
  is_genesys?: boolean;
  profiles: {
    username: string;
    avatar_url: string;
    clan_members: {
      clans: {
        tag: string;
      } | null;
    } | null;
  } | null;
}

export const FeaturedDecks = () => {
  const { data: decks, isLoading } = useQuery({
    queryKey: ["featuredDecks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name, is_genesys, profiles ( username, avatar_url, clan_members(clans(tag)) )")
        .eq("is_private", false) 
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Decks Recentes
        </h2>
        <Link to="/deck-builder" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Ver todos
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : decks && decks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {decks.map((deck) => (
            <Link to={`/deck/${deck.id}`} key={deck.id}>
              <Card className="h-full flex flex-col justify-between overflow-hidden group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-[hsl(0_0%_12%)] hover:bg-[hsl(0_0%_15%)] hover:border-primary/50">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold group-hover:text-primary transition-colors line-clamp-1">
                      {deck.deck_name}
                    </CardTitle>
                    {deck.is_genesys && (
                      <Badge className="bg-secondary text-[10px] px-1.5 h-5">Genesys</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-4 px-4">
                  {deck.profiles ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5 border border-border/50">
                        <AvatarImage src={deck.profiles.avatar_url} alt={deck.profiles.username} />
                        <AvatarFallback className="text-[8px]">{deck.profiles.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <UserDisplay profile={deck.profiles} clan={deck.profiles.clan_members?.clans?.tag ? { tag: deck.profiles.clan_members.clans.tag } : null} />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">por Usuário Desconhecido</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg bg-[hsl(0_0%_12%)]">
          <p>Nenhum deck recente para exibir. Crie o seu primeiro!</p>
        </div>
      )}
    </section>
  );
};