import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Plus, Trash2, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

interface Card {
  id: string;
  name: string;
  type: string;
  card_images: { image_url: string }[];
}

const DeckBuilder = ({ user, onLogout }: DeckBuilderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [mainDeck, setMainDeck] = useState<Card[]>([]);
  const [extraDeck, setExtraDeck] = useState<Card[]>([]);
  const [sideDeck, setSideDeck] = useState<Card[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const searchCards = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar cartas",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (card: Card, section: "main" | "extra" | "side") => {
    const limits = { main: 60, extra: 15, side: 15 };
    const decks = { main: mainDeck, extra: extraDeck, side: sideDeck };
    const setters = { main: setMainDeck, extra: setExtraDeck, side: setSideDeck };
    
    const currentDeck = decks[section];
    if (currentDeck.length >= limits[section]) {
      toast({
        title: "Limite atingido",
        description: `O ${section} deck não pode ter mais de ${limits[section]} cartas`,
        variant: "destructive",
      });
      return;
    }
    
    setters[section]([...currentDeck, card]);
  };

  const removeCard = (index: number, section: "main" | "extra" | "side") => {
    const decks = { main: mainDeck, extra: extraDeck, side: sideDeck };
    const setters = { main: setMainDeck, extra: setExtraDeck, side: setSideDeck };
    
    const newDeck = [...decks[section]];
    newDeck.splice(index, 1);
    setters[section](newDeck);
  };

  const saveDeck = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para salvar um deck",
        variant: "destructive",
      });
      return;
    }

    if (!deckName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o deck",
        variant: "destructive",
      });
      return;
    }

    if (mainDeck.length < 40) {
      toast({
        title: "Erro",
        description: "O Main Deck precisa ter no mínimo 40 cartas",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: deck, error: deckError } = await supabase
        .from("decks")
        .insert({ user_id: user.id, deck_name: deckName })
        .select()
        .single();

      if (deckError) throw deckError;

      const allCards = [
        ...mainDeck.map((card) => ({ deck_id: deck.id, card_api_id: card.id, deck_section: "main" })),
        ...extraDeck.map((card) => ({ deck_id: deck.id, card_api_id: card.id, deck_section: "extra" })),
        ...sideDeck.map((card) => ({ deck_id: deck.id, card_api_id: card.id, deck_section: "side" })),
      ];

      const { error: cardsError } = await supabase
        .from("deck_cards")
        .insert(allCards);

      if (cardsError) throw cardsError;

      toast({
        title: "Sucesso!",
        description: "Deck salvo com sucesso",
      });

      navigate(`/profile/${user.id}`);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar deck",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            Deck Builder
          </h1>
          <p className="text-muted-foreground text-lg">
            Crie seu deck perfeito com a API do YGOProDeck
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 bg-gradient-card border-border sticky top-24">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deck-name">Nome do Deck</Label>
                  <Input
                    id="deck-name"
                    placeholder="Meu Deck Épico"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="search">Buscar Cartas</Label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      placeholder="Nome da carta..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && searchCards()}
                    />
                    <Button onClick={searchCards} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="max-h-[600px] overflow-y-auto space-y-2">
                  {searchResults.map((card) => (
                    <Card
                      key={card.id}
                      className="p-2 cursor-pointer hover:shadow-glow transition-all group"
                    >
                      <img
                        src={card.card_images[0].image_url}
                        alt={card.name}
                        className="w-full rounded mb-2"
                      />
                      <p className="text-sm font-semibold truncate group-hover:text-primary">
                        {card.name}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => addCardToDeck(card, "main")}
                        >
                          Main
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => addCardToDeck(card, "extra")}
                        >
                          Extra
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => addCardToDeck(card, "side")}
                        >
                          Side
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={saveDeck}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Deck
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Deck Sections */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="main" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="main">
                  Main Deck ({mainDeck.length}/60)
                </TabsTrigger>
                <TabsTrigger value="extra">
                  Extra Deck ({extraDeck.length}/15)
                </TabsTrigger>
                <TabsTrigger value="side">
                  Side Deck ({sideDeck.length}/15)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="main" className="mt-6">
                <DeckSection
                  cards={mainDeck}
                  onRemove={(index) => removeCard(index, "main")}
                  emptyMessage="Adicione cartas ao Main Deck (mínimo 40)"
                />
              </TabsContent>

              <TabsContent value="extra" className="mt-6">
                <DeckSection
                  cards={extraDeck}
                  onRemove={(index) => removeCard(index, "extra")}
                  emptyMessage="Adicione cartas ao Extra Deck (máximo 15)"
                />
              </TabsContent>

              <TabsContent value="side" className="mt-6">
                <DeckSection
                  cards={sideDeck}
                  onRemove={(index) => removeCard(index, "side")}
                  emptyMessage="Adicione cartas ao Side Deck (máximo 15)"
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
};

interface DeckSectionProps {
  cards: Card[];
  onRemove: (index: number) => void;
  emptyMessage: string;
}

const DeckSection = ({ cards, onRemove, emptyMessage }: DeckSectionProps) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
      {cards.length > 0 ? (
        cards.map((card, index) => (
          <Card
            key={index}
            className="relative group overflow-hidden hover:shadow-glow transition-all"
          >
            <img
              src={card.card_images[0].image_url}
              alt={card.name}
              className="w-full"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))
      ) : (
        <div className="col-span-full text-center py-12 border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

export default DeckBuilder;
