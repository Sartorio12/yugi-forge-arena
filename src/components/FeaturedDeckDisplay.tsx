import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { FramedAvatar } from "./FramedAvatar";
import { Loader2, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface FeaturedDeckDisplayProps {
  deckId: number;
  snapshotId?: number;
  placement: string;
  deckName: string;
  isGenesys?: boolean;
  player: {
    username: string | null;
    avatar_url: string | null;
    id: string;
    clan_tag?: string | null;
  } | null;
}

interface CardData {
  id: string;
  name: string;
  image_url: string;
  image_url_small: string;
  ban_master_duel?: string | null;
  genesys_points?: number | null;
  md_rarity?: string | null;
}

interface DeckCard {
  card_api_id: string;
  deck_section: "main" | "extra" | "side";
  cards?: CardData;
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
    top: 1,
    right: 1,
    width: "30px",
    height: "30px",
    backgroundImage: `url('/genesys_1.png')`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: "10px",
    zIndex: 10,
    textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
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

const getBanlistIcon = (banStatus: string | null | undefined) => {
  if (banStatus === "Banned") return "/ban.png";
  if (banStatus === "Limited") return "/lim1.png";
  if (banStatus === "Semi-Limited") return "/lim2.png";
  return null;
};

export const FeaturedDeckDisplay = ({
  deckId,
  snapshotId,
  placement,
  deckName,
  isGenesys = false,
  player,
}: FeaturedDeckDisplayProps) => {
  
  const { data: deckCards, isLoading } = useQuery<DeckCard[]>({
    queryKey: ["featured-deck-cards", deckId, snapshotId],
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
          .eq("deck_id", deckId));
      }

      if (deckCardsError) throw deckCardsError;
      if (!deckCardsData || deckCardsData.length === 0) return [];

      // Get UNIQUE card IDs to avoid large "in" arrays and optimize query
      const uniqueCardApiIds = [...new Set(deckCardsData.map((c) => c.card_api_id))];

      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("*")
        .in("id", uniqueCardApiIds);

      if (cardsError) throw cardsError;

      return deckCardsData.map((deckCard) => ({
        ...deckCard,
        cards: cardsData?.find((card) => String(card.id) === String(deckCard.card_api_id)),
      })) as DeckCard[];
    },
  });

  const mainDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'main' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const extraDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'extra' && c.cards).map(c => c.cards!) || [], [deckCards]);
  const sideDeck = useMemo(() => deckCards?.filter(c => c.deck_section === 'side' && c.cards).map(c => c.cards!) || [], [deckCards]);

  const groupedMainDeck = useMemo(() => groupCards(mainDeck), [mainDeck]);
  const groupedExtraDeck = useMemo(() => groupCards(extraDeck), [extraDeck]);
  const groupedSideDeck = useMemo(() => groupCards(sideDeck), [sideDeck]);

  const getPlacementStyle = (place: string) => {
    const p = place.toLowerCase();
    if (p.includes("1") || p.includes("primeiro") || p.includes("first") || p.includes("winner") || p.includes("campeão")) {
      return "bg-yellow-500 text-black border-yellow-600";
    }
    if (p.includes("2") || p.includes("segundo") || p.includes("second") || p.includes("vice")) {
      return "bg-slate-300 text-black border-slate-400";
    }
    if (p.includes("3") || p.includes("terceiro") || p.includes("third")) {
      return "bg-amber-700 text-white border-amber-800";
    }
    return "bg-primary text-primary-foreground border-primary";
  };

  const linkTo = snapshotId ? `/deck/${deckId}?snapshot_id=${snapshotId}` : `/deck/${deckId}`;

  return (
    <div className="w-full mb-8">
        <Link to={linkTo} className="group block mb-4">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
                 <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded font-bold text-sm border shadow-sm ${getPlacementStyle(placement)}`}>
                        {placement}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                            {deckName}
                        </h3>
                        {player && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <FramedAvatar
                                    userId={player.id}
                                    avatarUrl={player.avatar_url}
                                    username={player.username}
                                    sizeClassName="h-5 w-5"
                                />
                                <span className="flex items-center gap-1">
                                    {player.clan_tag && <span className="font-bold text-primary">[{player.clan_tag}]</span>}
                                    {player.username}
                                </span>
                            </div>
                        )}
                    </div>
                 </div>
                 <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
        </Link>
      
      <Card className="bg-card/50 border-border overflow-hidden">
        <CardContent className="p-4">
            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Main Deck */}
                    <div>
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2">Main Deck ({mainDeck.length})</h4>
                        <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                            {groupedMainDeck.map(({ card, count }) => {
                                const banlistIcon = getBanlistIcon(card.ban_master_duel);
                                return (
                                    <CardStack key={card.id} card={card} count={count} isGenesys={isGenesys} banlistIcon={banlistIcon} />
                                );
                            })}
                        </div>
                    </div>

                    {/* Extra Deck */}
                    {groupedExtraDeck.length > 0 && (
                        <div>
                            <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                                {groupedExtraDeck.map(({ card, count }) => {
                                    const banlistIcon = getBanlistIcon(card.ban_master_duel);
                                    return (
                                        <CardStack key={card.id} card={card} count={count} isGenesys={isGenesys} banlistIcon={banlistIcon} />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Side Deck */}
                    {groupedSideDeck.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-muted-foreground mb-2">Side Deck ({sideDeck.length})</h4>
                            <div className="grid grid-cols-5 md:grid-cols-10 gap-1">
                                {groupedSideDeck.map(({ card, count }) => {
                                    const banlistIcon = getBanlistIcon(card.ban_master_duel);
                                    return (
                                        <CardStack key={card.id} card={card} count={count} isGenesys={isGenesys} banlistIcon={banlistIcon} />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
};