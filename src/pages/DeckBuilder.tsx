import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Save, Trash2, FileUp, FileDown, AlertTriangle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Interfaces
interface CardData {
  id: string;
  name: string; // English name
  pt_name?: string; // Portuguese name
  type: string;
  desc: string;
  race: string;
  attribute?: string;
  atk?: number;
  def?: number;
  level?: number;
  card_images: {
    image_url: string;
    image_url_small: string;
  }[];
}

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

const DeckBuilder = ({ user, onLogout }: DeckBuilderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [mainDeck, setMainDeck] = useState<CardData[]>([]);
  const [extraDeck, setExtraDeck] = useState<CardData[]>([]);
  const [sideDeck, setSideDeck] = useState<CardData[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Core Functions
  const searchCards = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    try {
      const englishUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(trimmedQuery)}`;
      const portugueseUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(trimmedQuery)}&language=pt`;

      const [englishResult, portugueseResult] = await Promise.allSettled([
        fetch(englishUrl).then(res => res.json()),
        fetch(portugueseUrl).then(res => res.json()),
      ]);

      let englishCards: CardData[] = [];
      if (englishResult.status === 'fulfilled' && englishResult.value.data) {
        englishCards = englishResult.value.data;
      }

      const portugueseNames = new Map<string, string>();
      if (portugueseResult.status === 'fulfilled' && portugueseResult.value.data) {
        portugueseResult.value.data.forEach((card: { id: string; name: string }) => {
          portugueseNames.set(String(card.id), card.name);
        });
      }

      const finalResults = englishCards.map(card => ({
        ...card,
        pt_name: portugueseNames.get(String(card.id)) || undefined,
      }));
      
      finalResults.sort((a, b) => a.name.localeCompare(b.name));

      setSearchResults(finalResults);

    } catch (error) {
      toast({ title: "Erro", description: "Erro ao buscar cartas", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (card: CardData) => {
    const limit = 3;

    const currentCopies = [...mainDeck, ...extraDeck, ...sideDeck].filter(c => c.id === card.id).length;

    if (currentCopies >= limit) {
      toast({
        title: "Limite de Cópias Atingido",
        description: `Você já possui ${currentCopies} cópias de "${card.name}". O limite é ${limit}.`,
        variant: "destructive",
      });
      return;
    }
    
    const extraDeckTypes = ["Fusion Monster", "Synchro Monster", "XYZ Monster", "Link Monster"];
    if (extraDeckTypes.includes(card.type)) {
      if (extraDeck.length >= 15) {
        toast({ title: "Limite atingido", description: "O Extra Deck não pode ter mais de 15 cartas.", variant: "destructive" });
        return;
      }
      setExtraDeck([...extraDeck, card]);
    } else {
      if (mainDeck.length >= 60) {
        toast({ title: "Limite atingido", description: "O Main Deck não pode ter mais de 60 cartas.", variant: "destructive" });
        return;
      }
      setMainDeck([...mainDeck, card]);
    }
  };
  
  const removeCard = (index: number, section: "main" | "extra" | "side") => {
    const decks = { main: mainDeck, extra: extraDeck, side: sideDeck };
    const setters = { main: setMainDeck, extra: setExtraDeck, side: setSideDeck };
    const newDeck = [...decks[section]];
    newDeck.splice(index, 1);
    setters[section](newDeck);
  };

  const clearDeck = () => {
    setMainDeck([]);
    setExtraDeck([]);
    setSideDeck([]);
    setDeckName("");
  }

  const saveDeck = async () => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para salvar um deck", variant: "destructive" });
      return;
    }
    if (!deckName.trim()) {
      toast({ title: "Erro", description: "Digite um nome para o deck", variant: "destructive" });
      return;
    }
    if (mainDeck.length < 40) {
      toast({ title: "Erro", description: "O Main Deck precisa ter no mínimo 40 cartas", variant: "destructive" });
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
      const { error: cardsError } = await supabase.from("deck_cards").insert(allCards);
      if (cardsError) throw cardsError;
      toast({ title: "Sucesso!", description: "Deck salvo com sucesso" });
      navigate(`/profile/${user.id}`);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar deck", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4 mb-6">
          {!user && (
            <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/30 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              Você deve estar logado para salvar um deck.
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline"><FileUp className="h-4 w-4 mr-2" /> Importar</Button>
            <Button variant="outline"><FileDown className="h-4 w-4 mr-2" /> Exportar</Button>
            <Button variant="destructive" onClick={clearDeck}><Trash2 className="h-4 w-4 mr-2" /> Limpar Deck</Button>
            <div className="flex-grow"></div>
            <Button onClick={saveDeck} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Deck
            </Button>
          </div>
          <div>
            <Label htmlFor="deck-name" className="text-sm font-bold mb-2 block">Deck Name</Label>
            <Input
              id="deck-name"
              placeholder="Dê um nome ao seu Deck"
              className="text-lg"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          <div className="w-full lg:w-[65%] space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Main Deck</h2>
                <span className="text-muted-foreground">{mainDeck.length} Cartas</span>
              </div>
              <div className="bg-stone-900 p-4 rounded-lg min-h-[200px]">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {mainDeck.map((card, index) => (
                    <div key={index} className="relative group">
                      <img src={card.card_images[0].image_url} alt={card.name} className="rounded-md w-full" />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "main")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Extra Deck</h2>
                <span className="text-muted-foreground">{extraDeck.length} Cartas</span>
              </div>
              <div className="bg-indigo-950 p-4 rounded-lg min-h-[100px]">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-15 gap-2">
                  {extraDeck.map((card, index) => (
                     <div key={index} className="relative group">
                      <img src={card.card_images[0].image_url} alt={card.name} className="rounded-md w-full" />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "extra")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Side Deck</h2>
                <span className="text-muted-foreground">{sideDeck.length} Cartas</span>
              </div>
              <div className="bg-emerald-950 p-4 rounded-lg min-h-[100px]">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-15 gap-2">
                  {sideDeck.map((card, index) => (
                     <div key={index} className="relative group">
                      <img src={card.card_images[0].image_url} alt={card.name} className="rounded-md w-full" />
                      <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "side")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[35%]">
            <div className="sticky top-24 space-y-4">
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Buscar pelo nome da carta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchCards()}
                />
                <Button onClick={searchCards} disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 border-0">Filtrar Cartas</Button>
                <select className="bg-background border border-border rounded-md p-2">
                  <option>Nome</option>
                  <option>Nível</option>
                  <option>ATK</option>
                </select>
                <span className="text-muted-foreground">Resultados: {searchResults.length}</span>
              </div>
              <div className="h-[60vh] overflow-y-auto bg-stone-900/50 p-2 rounded-lg">
                {searchResults.map((card) => (
                  <HoverCard key={card.id} openDelay={200}>
                    <HoverCardTrigger asChild>
                      <div onClick={() => addCardToDeck(card)} className="flex items-center gap-3 p-2 rounded-md hover:bg-stone-800 cursor-pointer">
                        <img src={card.card_images[0].image_url_small} alt={card.name} className="w-12 rounded-sm" />
                        <div className="text-sm flex-1 min-w-0">
                          <p className="font-bold truncate">{card.name}</p>
                          {card.pt_name && card.pt_name.toLowerCase() !== card.name.toLowerCase() && (
                            <p className="text-gray-400 truncate">{card.pt_name}</p>
                          )}
                          <p className="text-muted-foreground text-xs truncate">{card.attribute} / {card.race}</p>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="left" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background">
                      <div className="w-2/5">
                        <img src={card.card_images[0].image_url} alt={card.name} className="rounded-md w-full" />
                      </div>
                      <div className="w-3/5 space-y-1">
                        <h3 className="font-bold text-md">{card.name}</h3>
                        {card.pt_name && card.pt_name.toLowerCase() !== card.name.toLowerCase() && (
                          <h4 className="text-sm text-gray-300 -mt-1">{card.pt_name}</h4>
                        )}
                        <p className="text-xs font-bold text-yellow-400">[{card.race} / {card.type}]</p>
                        <div className="flex justify-start gap-3 text-xs pt-1">
                          {card.level && <span>Level: {card.level}</span>}
                          {card.atk !== undefined && <span>ATK/{card.atk}</span>}
                          {card.def !== undefined && <span>DEF/{card.def}</span>}
                        </div>
                        <p className="text-xs border-t border-border pt-2 mt-2 whitespace-pre-wrap h-48 overflow-y-auto">{card.desc}</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeckBuilder;
