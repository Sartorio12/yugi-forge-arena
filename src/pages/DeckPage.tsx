import { useState, useRef, useMemo } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, Loader2, Heart, MessageSquare, Copy } from "lucide-react";
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
  md_rarity?: string | null;
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

const RarityIcon = ({ rarity }: { rarity: string | undefined | null }) => {
  if (!rarity) {
    return null;
  }

  let imageUrl: string | undefined;
  if (rarity === "Normal") {
    imageUrl = "/normal.png";
  } else if (rarity === "Rare") {
    imageUrl = "/rare.png";
  } else if (rarity === "Super Rare") {
    imageUrl = "/super_rare.png";
  } else if (rarity === "Ultra Rare") {
    imageUrl = "/ultra_rare.png";
  } else {
    return null;
  }

  const style: React.CSSProperties = {
    position: "absolute",
    top: -10,
    right: 0,
    width: "35px",
    height: "35px",
    backgroundImage: `url('${imageUrl}')`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    zIndex: 10,
  };

  return <div style={style} />;
};

const GenesysPointBadge = ({ points }: { points: number | undefined | null }) => {
  if (!points || points === 0) return null;

  const style: React.CSSProperties = {
    position: "absolute",
    top: 1, // Changed from bottom: 0
    right: 1, // Changed from right: 0
    width: "30px", // Adjust based on image size
    height: "30px", // Adjust based on image size
    backgroundImage: `url('/genesys_1.png')`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: "10px", // Adjust font size to fit
    zIndex: 10,
    textShadow: "1px 1px 2px rgba(0,0,0,0.7)", // Add text shadow for better readability
  };

  return <div style={style}>{points}</div>;
};

const CardStack = ({ card, count, isGenesys, banlistIcon }: { card: CardData; count: number; isGenesys?: boolean; banlistIcon: string | null }) => {
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger>
        <div className="relative">
          <img src={card.image_url_small} alt={card.name} className="w-full rounded-none transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg" />
          {count > 1 && (
            <img src={`/${count}x.webp`} alt={`${count} copies`} className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50%] h-auto" />
          )}
          {isGenesys && card.genesys_points != null && card.genesys_points > 0 && (
            <GenesysPointBadge points={card.genesys_points} />
          )}
          {banlistIcon && (
            <img src={banlistIcon} alt="Banlist Status" className="absolute top-1 left-1 w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7" />
          )}
          <RarityIcon rarity={card.md_rarity} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top">
        <img src={card.image_url} alt={card.name} className="w-full rounded-none" />
      </HoverCardContent>
    </HoverCard>
  );
};

const groupCards = (cards: CardData[]) => {
  const cardCounts = new Map<string, { card: CardData; count: number }>();
  cards.forEach(card => {
    if (cardCounts.has(card.id)) {
      cardCounts.get(card.id)!.count++;
    } else {
      cardCounts.set(card.id, { card, count: 1 });
    }
  });
  return Array.from(cardCounts.values());
};

const DeckPage = ({ user, onLogout }: DeckPageProps) => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const snapshotId = searchParams.get('snapshot_id');
  const navigate = useNavigate();
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

  // Fetch live deck data
  const { data: liveDeck, isLoading: isLoadingLiveDeck } = useQuery<Deck | null>({
    queryKey: ["deck", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .select("*, profiles(*, equipped_frame_url)")
        .eq("id", id)
        .single();
      if (error) {
        console.error("Error fetching deck:", error);
        return null;
      }
      return data as Deck;
    },
    enabled: !snapshotId, // Only run if not a snapshot
  });

  // Fetch snapshot deck data
  const { data: snapshotDeck, isLoading: isLoadingSnapshotDeck } = useQuery<Deck | null>({
      queryKey: ["deck-snapshot", snapshotId],
      queryFn: async () => {
          const { data, error } = await supabase
              .from("tournament_deck_snapshots")
              .select("*, profiles(*, equipped_frame_url)")
              .eq("id", snapshotId)
              .single();
          if (error) {
              console.error("Error fetching deck snapshot:", error);
              return null;
          }
          // The snapshot table has a similar structure to the decks table
          return data as Deck;
      },
      enabled: !!snapshotId, // Only run if it is a snapshot
  });

  const deck = snapshotId ? snapshotDeck : liveDeck;
  const isLoadingDeck = snapshotId ? isLoadingSnapshotDeck : isLoadingLiveDeck;

  const { data: authorClan, isLoading: isLoadingAuthorClan } = useQuery({
    queryKey: ["user-clan", deck?.user_id],
    queryFn: async () => {
      if (!deck?.user_id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", deck.user_id)
        .limit(1)
        .maybeSingle();
      return data?.clans;
    },
    enabled: !!deck?.user_id,
  });

  const { data: deckCards, isLoading: isLoadingCards } = useQuery<DeckCard[]>({
    queryKey: ["deck-cards", id, snapshotId],
    queryFn: async () => {
      let deckCardsData, deckCardsError;

      if (snapshotId) {
        ({ data: deckCardsData, error: deckCardsError } = await supabase
          .from("tournament_deck_snapshot_cards")
          .select("card_api_id, deck_section")
          .eq("snapshot_id", snapshotId));
      } else {
        ({ data: deckCardsData, error: deckCardsError } = await supabase
          .from("deck_cards")
          .select("card_api_id, deck_section")
          .eq("deck_id", id));
      }

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
    enabled: !snapshotId, // Likes are for live decks, not snapshots
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
        .limit(1)
        .maybeSingle();
      if (error || !data) return false;
      return true;
    },
    enabled: !!user && !snapshotId,
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
    enabled: !snapshotId,
  });

  const mainDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'main' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const extraDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'extra' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const sideDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'side' && c.cards).map(c => c.cards!) || [], [deckCards]);

  const groupedMainDeck = useMemo(() => groupCards(mainDeck), [mainDeck]);
  const groupedExtraDeck = useMemo(() => groupCards(extraDeck), [extraDeck]);
  const groupedSideDeck = useMemo(() => groupCards(sideDeck), [sideDeck]);

  const genesysPoints = useMemo(() => {
    if (!deck?.is_genesys) return 0;
    const mainDeckPoints = mainDeck.reduce((acc, card) => acc + (card.genesys_points || 0), 0);
    const extraDeckPoints = extraDeck.reduce((acc, card) => acc + (card.genesys_points || 0), 0);
    return mainDeckPoints + extraDeckPoints;
  }, [deck, mainDeck, extraDeck]);

  const isLoading = isLoadingDeck || isLoadingCards || isLoadingAuthorClan || isLoadingLikes || isLoadingComments || isLoadingUserHasLiked;

  const toggleLike = async () => {
    if (!user || snapshotId) {
      toast({
        title: "Ação não permitida",
        description: snapshotId ? "Não é possível curtir um snapshot de deck." : "Você precisa estar logado para curtir um deck.",
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
    }
    else {
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

  const handleCopyDeck = () => {
    if (!user) {
        toast({
            title: "Ação necessária",
            description: "Você precisa estar logado para copiar um deck.",
            variant: "destructive",
        });
        return;
    }

    if (!deck) return;

    const deckData = {
        deckName: `Cópia de ${deck.deck_name}`,
        mainDeck: mainDeck,
        extraDeck: extraDeck,
        sideDeck: sideDeck,
        isPrivate: true, // Default to private for copies
        isGenesysMode: deck.is_genesys || false,
    };

    localStorage.setItem('importDeckData', JSON.stringify(deckData));
    toast({
        title: "Deck Copiado",
        description: "Redirecionando para o Deck Builder...",
    });
    navigate('/deck-builder');
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
        <p className="text-2xl text-destructive">{snapshotId ? "Snapshot de deck não encontrado." : "Esse deck é privado ou não existe."}</p>
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

  const getBanlistIcon = (banStatus: string | null | undefined) => {
    if (banStatus === "Banned") return "/ban.png";
    if (banStatus === "Limited") return "/lim1.png";
    if (banStatus === "Semi-Limited") return "/lim2.png";
    return null;
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-8">
        <Card className="bg-transparent border-none bg-cover bg-center" style={{ backgroundImage: "url('/bg-main.png')"}}>
          <CardHeader className="bg-card/50 rounded-t-lg">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold">{deck.deck_name}</h1>
              {deck.is_genesys && (
                <>
                  <Badge className="bg-secondary text-lg">Genesys</Badge>
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
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-muted-foreground">
                  {!snapshotId && (
                      <>
                        <Button variant="ghost" size="sm" onClick={toggleLike} disabled={!user}>
                            <Heart className={`h-5 w-5 mr-2 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                            <span>{likeCount} Likes</span>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={scrollToComments}>
                            <MessageSquare className="h-5 w-5 mr-2" />
                            <span>{commentCount} Comentários</span>
                        </Button>
                      </>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleCopyDeck}>
                      <Copy className="h-5 w-5 mr-2" />
                      <span>Copiar Deck</span>
                  </Button>
            </div>
          </CardHeader>
          <CardContent className="bg-card/50 rounded-b-lg">
            <div className="space-y-2">
              <div>
                <h2 className="text-2xl font-bold mb-4">Main Deck ({mainDeck.length})</h2>
                <div className="grid grid-cols-7 md:grid-cols-15 gap-x-1 gap-y-5">
                  {groupedMainDeck.map(({ card, count }) => {
                    const banlistIcon = getBanlistIcon(card.ban_master_duel);
                    return (
                      <CardStack key={card.id} card={card} count={count} isGenesys={deck.is_genesys} banlistIcon={banlistIcon} />
                    );
                  })}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-4">Extra Deck ({extraDeck.length})</h2>
                <div className="grid grid-cols-7 md:grid-cols-15 gap-x-1 gap-y-5">
                  {groupedExtraDeck.map(({ card, count }) => {
                    const banlistIcon = getBanlistIcon(card.ban_master_duel);
                    return (
                      <CardStack key={card.id} card={card} count={count} isGenesys={deck.is_genesys} banlistIcon={banlistIcon} />
                    );
                  })}
                </div>
              </div>
              {sideDeck.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-4">Side Deck ({sideDeck.length})</h2>
                  <div className="grid grid-cols-7 md:grid-cols-15 gap-x-1 gap-y-5">
                    {groupedSideDeck.map(({ card, count }) => {
                      const banlistIcon = getBanlistIcon(card.ban_master_duel);
                      return (
                        <CardStack key={card.id} card={card} count={count} isGenesys={deck.is_genesys} banlistIcon={banlistIcon} />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!snapshotId && (
            <div className="mt-8" ref={commentsRef}>
                <DeckCommentSection deckId={deck.id} user={user} />
            </div>
        )}
      </main>
    </div>
  );
};


export default DeckPage;
