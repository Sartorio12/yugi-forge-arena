import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Layers, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FramedAvatar } from '@/components/FramedAvatar';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDisplay from "@/components/UserDisplay";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { useDebounce } from "use-debounce";

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
  featured_card?: {
    image_url_small: string;
    name: string;
  } | null;
}

const CommunityDecksPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500); // Debounce for 500ms

  const { data: decks, isLoading } = useQuery<Deck[]>({
    queryKey: ["communityDecks", debouncedSearchTerm],
    queryFn: async () => {
      let cardIds: string[] = [];
      if (debouncedSearchTerm) {
        const { data: cardsData, error: cardsError } = await supabase
          .from("cards")
          .select("id")
          .or(`name.ilike.%${debouncedSearchTerm}%,pt_name.ilike.%${debouncedSearchTerm}%`);

        if (cardsError) throw cardsError;
        cardIds = cardsData?.map((card) => card.id) || [];

        if (cardIds.length === 0) {
          // If no cards match, return empty array for decks
          return [];
        }
      }

      let query = supabase
        .from("decks")
        .select("id, deck_name, is_genesys, profiles ( id, username, avatar_url, equipped_frame_url, clan_members(clans(tag)) )")
        .eq("is_private", false);

      if (cardIds.length > 0) {
        // First, find all deck_ids that contain any of the matched card_api_ids
        const { data: matchingDeckCards, error: deckCardsError } = await supabase
          .from("deck_cards")
          .select("deck_id")
          .in("card_api_id", cardIds);

        if (deckCardsError) throw deckCardsError;

        const matchingDeckIds = [...new Set(matchingDeckCards?.map((dc) => dc.deck_id))] || [];

        if (matchingDeckIds.length === 0) {
          // If no decks contain the matched cards, return empty array
          return [];
        }

        // Then, filter the main decks query by these deck_ids
        query = query.in("id", matchingDeckIds);
      }
      
      query = query.order("created_at", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const decksWithFeaturedCards = await Promise.all(
        (data || []).map(async (deck) => {
          const { data: featuredCardData, error: featuredCardError } = await supabase.rpc(
            "get_featured_card_for_deck",
            { p_deck_id: deck.id }
          ).single();

          if (featuredCardError) {
            console.error(`Error fetching featured card for deck ${deck.id}:`, featuredCardError);
          }

          return {
            ...deck,
            featured_card: featuredCardData || null,
          };
        })
      );
      return decksWithFeaturedCards;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={null} onLogout={() => {}} />
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Layers className="h-7 w-7 text-primary" />
          Todos os Decks da Comunidade
        </h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar builds.."
            className="pl-10 pr-4 py-2 w-full rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <Link to={`/deck/${deck.id}`} key={deck.id}>
                <Card className="h-full flex flex-col justify-between overflow-hidden group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-[hsl(0_0%_12%)] hover:bg-[hsl(0_0%_15%)] hover:border-primary/50 border-t-0 rounded-t-none">
                  <CardHeader className={deck.featured_card?.image_url_small ? "pb-2 p-0" : "pb-2 pt-4 px-4"}>
                    {deck.featured_card?.image_url_small && (
                      <div className="w-full h-[180px] overflow-hidden mb-2">
                        <img
                          src={deck.featured_card.image_url_small}
                          alt={deck.featured_card.name || "Featured Card"}
                          className="w-full h-full object-cover object-[0%_30%] scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2 px-4">
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
                        <FramedAvatar
                          userId={deck.profiles.id}
                          avatarUrl={deck.profiles.avatar_url}
                          username={deck.profiles.username}
                          sizeClassName="h-5 w-5"
                          showFrame={false}
                        />
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
            <p>Nenhum deck público disponível.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDecksPage;
