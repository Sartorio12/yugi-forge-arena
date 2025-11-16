import { useState, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Loader2, Heart, MessageSquare } from "lucide-react";
import { DeckCommentSection } from "@/components/comments/DeckCommentSection";
import UserDisplay from "@/components/UserDisplay";
import { Tables } from "@/integrations/supabase/types";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Interfaces
interface CardData {
  id: string;
  name: string;
  pt_name?: string | null;
  type: string;
  description: string;
  race: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  image_url: string;
  image_url_small: string;
  ban_tcg?: string;
  ban_ocg?: string;
  ban_master_duel?: string | null;
  genesys_points?: number | null;
}

type Profile = Tables<"profiles">;

interface Deck {
  id: number;
  deck_name: string;
  is_private: boolean;
  is_genesys?: boolean;
  user_id: string;
  profiles: Profile | null;
}

interface DeckCard {
  card_api_id: string;
  deck_section: "main" | "extra" | "side";
  cards?: CardData;
}


interface DeckPageProps {
  user: User | null;
  onLogout: () => void;
}

const DeckPage = ({ user, onLogout }: DeckPageProps) => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const commentsRef = useRef<HTMLDivElement>(null);

  const { data: currentUserRole } = useQuery<string | null>({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc("get_user_role");
      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }
      return data;
    },
    enabled: !!user,
  });

  const { data: deck, isLoading: isLoadingDeck } = useQuery<Deck | null>({
    queryKey: ["deck", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*, profiles(*)")
        .eq("id", id)
        .single();
      if (error) {
        console.error("Error fetching deck:", error);
        return null;
      }
      return data as Deck;
    },
  });

  const { data: authorClan, isLoading: isLoadingAuthorClan } = useQuery({
    queryKey: ["user-clan", deck?.user_id],
    queryFn: async () => {
      if (!deck?.user_id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", deck.user_id)
        .single();
      return data?.clans;
    },
    enabled: !!deck?.user_id,
  });

  const { data: deckCards, isLoading: isLoadingCards } = useQuery<DeckCard[]>({
    queryKey: ["deck-cards", id],
    queryFn: async () => {
      const { data: deckCardsData, error: deckCardsError } = await supabase
        .from("deck_cards")
        .select("card_api_id, deck_section")
        .eq("deck_id", id);

      if (deckCardsError) throw deckCardsError;
      if (!deckCardsData) return [];

      const cardApiIds = deckCardsData.map((c) => c.card_api_id);

      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .in("id", cardApiIds);

      if (cardsError) throw cardsError;

      return deckCardsData.map((deckCard) => ({
        ...deckCard,
        cards: cardsData?.find((card) => card.id === deckCard.card_api_id),
      })) as DeckCard[];
    },
  });

  const { data: likeCount, isLoading: isLoadingLikes } = useQuery<number>({
    queryKey: ["deck-likes-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("deck_likes")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", id);
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: userHasLiked, isLoading: isLoadingUserHasLiked } = useQuery<boolean>({
    queryKey: ["user-has-liked-deck", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("deck_likes")
        .select("id")
        .eq("deck_id", id)
        .eq("user_id", user.id)
        .single();
      if (error || !data) return false;
      return true;
    },
    enabled: !!user,
  });

  const { data: commentCount, isLoading: isLoadingComments } = useQuery<number>({
    queryKey: ["deck-comments-count", id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("deck_comments")
        .select("*", { count: "exact", head: true })
        .eq("deck_id", id);
      if (error) return 0;
      return count || 0;
    },
  });

  const mainDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'main' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const extraDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'extra' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const sideDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'side' && c.cards).map(c => c.cards!) || [], [deckCards]);

  const genesysPoints = useMemo(() => {
    if (!deck?.is_genesys) return 0;
    const mainDeckPoints = mainDeck.reduce((acc, card) => acc + (card.genesys_points || 0), 0);
    const extraDeckPoints = extraDeck.reduce((acc, card) => acc + (card.genesys_points || 0), 0);
    return mainDeckPoints + extraDeckPoints;
  }, [deck, mainDeck, extraDeck]);

  const isLoading = isLoadingDeck || isLoadingCards || isLoadingAuthorClan || isLoadingLikes || isLoadingComments || isLoadingUserHasLiked;

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Ação necessária",
        description: "Você precisa estar logado para curtir um deck.",
        variant: "destructive",
      });
      return;
    }

    if (userHasLiked) {
      // Unlike
      const { error } = await supabase
        .from("deck_likes")
        .delete()
        .eq("deck_id", id)
        .eq("user_id", user.id);
      if (error) {
        toast({ title: "Erro", description: "Não foi possível remover o like.", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["deck-likes-count", id] });
        queryClient.invalidateQueries({ queryKey: ["user-has-liked-deck", id, user.id] });
      }
    } else {
      // Like
      const { error } = await supabase
        .from("deck_likes")
        .insert({ deck_id: Number(id), user_id: user.id });
      if (error) {
        toast({ title: "Erro", description: "Não foi possível curtir o deck.", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["deck-likes-count", id] });
        queryClient.invalidateQueries({ queryKey: ["user-has-liked-deck", id, user.id] });
      }
    }
  };

  const scrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-background text-center py-20">
        <p className="text-2xl text-destructive">Esse deck é privado</p>
        <Button asChild variant="link" className="mt-4">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" /> Voltar para a Home
          </Link>
        </Button>
      </div>
    );
  }

  if (deck.is_private && deck.user_id !== user?.id && currentUserRole !== 'admin' && currentUserRole !== 'organizer') {
    return (
        <div className="min-h-screen bg-background text-center py-20">
            <p className="text-2xl text-destructive">Este deck é privado.</p>
            <Button asChild variant="link" className="mt-4">
                <Link to="/">
                    <Home className="mr-2 h-4 w-4" /> Voltar para a Home
                </Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold">{deck.deck_name}</h1>
              {deck.is_genesys && (
                <>
                  <Badge className="bg-violet-500 text-lg">Genesys</Badge>
                  <Badge className="bg-amber-500 text-lg">{genesysPoints} Pontos</Badge>
                </>
              )}
            </div>
            {deck.profiles && (
              <p className="text-lg text-muted-foreground mb-4">
                Criado por:{" "}
                <Link to={`/profile/${deck.user_id}`} className="text-primary hover:underline">
                  <UserDisplay profile={deck.profiles} clan={authorClan} />
                </Link>
              </p>
            )}
            <div className="flex items-center gap-4 text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={toggleLike} disabled={!user}>
                    <Heart className={`h-5 w-5 mr-2 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                    <span>{likeCount} Likes</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={scrollToComments}>
                    <MessageSquare className="h-5 w-5 mr-2" />
                    <span>{commentCount} Comentários</span>
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Main Deck ({mainDeck.length})</h2>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                  {mainDeck.map((card) => (
                    <HoverCard key={card.id} openDelay={200}>
                        <HoverCardTrigger>
                            <img src={card.image_url_small} alt={card.name} className="w-full rounded-none transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg" />
                        </HoverCardTrigger>
                        <HoverCardContent side="top">
                            <img src={card.image_url} alt={card.name} className="w-full rounded-none" />
                        </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Extra Deck ({extraDeck.length})</h2>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                  {extraDeck.map((card) => (
                     <HoverCard key={card.id} openDelay={200}>
                        <HoverCardTrigger>
                            <img src={card.image_url_small} alt={card.name} className="w-full rounded-none transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg" />
                        </HoverCardTrigger>
                        <HoverCardContent side="top">
                            <img src={card.image_url} alt={card.name} className="w-full rounded-none" />
                        </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
              {sideDeck.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-2">Side Deck ({sideDeck.length})</h2>
                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2">
                    {sideDeck.map((card) => (
                        <HoverCard key={card.id} openDelay={200}>
                            <HoverCardTrigger>
                                <img src={card.image_url_small} alt={card.name} className="w-full rounded-none transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg" />
                            </HoverCardTrigger>
                            <HoverCardContent side="top">
                                <img src={card.image_url} alt={card.name} className="w-full rounded-none" />
                            </HoverCardContent>
                        </HoverCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-8" ref={commentsRef}>
            <DeckCommentSection deckId={deck.id} user={user} />
        </div>
      </main>
    </div>
  );
};

export default DeckPage;
