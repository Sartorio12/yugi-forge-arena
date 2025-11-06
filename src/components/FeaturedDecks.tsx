import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Deck {
  id: number;
  deck_name: string;
  profiles: {
    username: string;
    avatar_url: string;
  } | null;
}

export const FeaturedDecks = () => {
  const { data: decks, isLoading } = useQuery({
    queryKey: ["featuredDecks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("id, deck_name, profiles ( username, avatar_url )")
        .eq("is_private", false) // <<< ADIÇÃO CRUCIAL
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      return data as Deck[];
    },
  });

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Decks Recentes da Comunidade
        </h2>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <Link to={`/deck/${deck.id}`} key={deck.id}>
                <Card className="h-full flex flex-col justify-between overflow-hidden group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-gradient-card">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                      {deck.deck_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {deck.profiles ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={deck.profiles.avatar_url} alt={deck.profiles.username} />
                          <AvatarFallback>{deck.profiles.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>por {deck.profiles.username}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">por Usuário Desconhecido</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p>Nenhum deck recente para exibir. Crie o seu primeiro!</p>
          </div>
        )}
      </div>
    </section>
  );
};