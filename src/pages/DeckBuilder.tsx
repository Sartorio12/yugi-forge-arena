import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Save, Trash2, FileUp, FileDown, AlertTriangle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

// Interfaces
interface CardData {
  id: string;
  name: string; // English name
  pt_name?: string | null; // Portuguese name - Updated to be nullable
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
  ban_master_duel?: string | null; // New field for Master Duel banlist
}

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

const BanlistIcon = ({ banStatus }: { banStatus: string | undefined | null }) => {
  if (banStatus === undefined || banStatus === null) return null;

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "black",
    fontWeight: "bold",
    fontSize: "14px",
    zIndex: 10,
  };

  if (banStatus === "Forbidden") {
    return (
      <div style={{ ...baseStyle, backgroundColor: "red" }}>
        <div style={{ width: "80%", height: "3px", backgroundColor: "white", transform: "rotate(45deg)", position: "absolute" }}></div>
        <div style={{ width: "80%", height: "3px", backgroundColor: "white", transform: "rotate(-45deg)", position: "absolute" }}></div>
      </div>
    );
  }
  if (banStatus === "Limited") {
    return <div style={{ ...baseStyle, backgroundColor: "yellow" }}>1</div>;
  }
  if (banStatus === "Semi-Limited") {
    return <div style={{ ...baseStyle, backgroundColor: "cyan" }}>2</div>;
  }
  return null;
};



const DeckBuilder = ({ user, onLogout }: DeckBuilderProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  // State
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null);
  const [isLoadingDeck, setIsLoadingDeck] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [mainDeck, setMainDeck] = useState<CardData[]>([]);
  const [extraDeck, setExtraDeck] = useState<CardData[]>([]);
  const [sideDeck, setSideDeck] = useState<CardData[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);



  const isExtraDeckCard = (type: string) => 
    type.includes("Fusion") || type.includes("Synchro") || type.includes("XYZ") || type.includes("Link");

  // Load deck for editing
  useEffect(() => {
    const deckId = searchParams.get('edit');
    if (deckId && user) {
      loadDeckForEditing(Number(deckId));
    } else {
      setIsLoadingDeck(false);
    }
  }, [searchParams, user]);

  const loadDeckForEditing = async (deckId: number) => {
    setIsLoadingDeck(true);
    try {
      const { data: deckData, error: deckError } = await supabase
        .from('decks')
        .select('deck_name, user_id, is_private')
        .eq('id', deckId)
        .single();

      if (deckError || !deckData) throw new Error("Deck para edição não encontrado.");
      if (deckData.user_id !== user?.id) throw new Error("Você não tem permissão para editar este deck.");

      setDeckName(deckData.deck_name);
      setIsPrivate(deckData.is_private);
      setEditingDeckId(deckId);

      const { data: deckCards, error: cardsError } = await supabase
        .from('deck_cards')
        .select('card_api_id, deck_section')
        .eq('deck_id', deckId);

      if (cardsError) throw cardsError;
      if (!deckCards) {
        setIsLoadingDeck(false);
        return;
      }

      const allIds = [...new Set(deckCards.map(c => c.card_api_id))].filter(Boolean);
      if (allIds.length === 0) {
        setIsLoadingDeck(false);
        return;
      }

      const { data: apiData, error: fetchCardsError } = await supabase
        .from('cards')
        .select('*')
        .in('id', allIds);

      if (fetchCardsError || !apiData) throw new Error("Erro ao buscar dados das cartas no banco de dados.");

      const cardDataMap = new Map(apiData.map((c: CardData) => [String(c.id), c]));

      const newMain: CardData[] = deckCards.filter(dc => dc.deck_section === 'main').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];
      const newExtra: CardData[] = deckCards.filter(dc => dc.deck_section === 'extra').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];
      const newSide: CardData[] = deckCards.filter(dc => dc.deck_section === 'side').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];

      setMainDeck(newMain);
      setExtraDeck(newExtra);
      setSideDeck(newSide);

    } catch (error: any) {
      toast({ title: "Erro ao Carregar Deck", description: error.message, variant: "destructive" });
      navigate("/deck-builder");
    } finally {
      setIsLoadingDeck(false);
    }
  };

  const searchCards = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    try {
      const { data: cards, error } = await supabase
        .from('cards')
        .select('*')
        .or(`name.ilike.%${trimmedQuery.toLowerCase()}%,pt_name.ilike.%${trimmedQuery.toLowerCase()}%`)
        .limit(50); // Limit search results for performance

      if (error) throw error;

      const getSortRank = (type: string) => {
        if (type.includes('Normal Monster')) return 0;
        if (type.includes('Effect Monster') && !type.includes('Pendulum')) return 1;
        if (type.includes('Pendulum')) return 2;
        if (type.includes('Ritual')) return 3;
        if (type.includes('Fusion')) return 4;
        if (type.includes('Synchro')) return 5;
        if (type.includes('XYZ')) return 6;
        if (type.includes('Link')) return 7;
        if (type.includes('Spell Card')) return 8;
        if (type.includes('Trap Card')) return 9;
        return 10;
      };

      cards.sort((a, b) => {
        const rankA = getSortRank(a.type);
        const rankB = getSortRank(b.type);
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return a.name.localeCompare(b.name);
      });

      setSearchResults(cards || []);

    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao buscar cartas", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (card: CardData, section: 'main' | 'extra' | 'side') => {
    const status = card.ban_master_duel; // Use Master Duel banlist
    let limit = 3;
    if (status === "Forbidden") {
      toast({ title: "Carta Banida", description: `"${card.name}" é proibida e não pode ser adicionada ao deck.`, variant: "destructive" });
      return;
    }
    if (status === "Limited") {
      limit = 1;
    }
    if (status === "Semi-Limited") {
      limit = 2;
    }

    const currentCopies = [...mainDeck, ...extraDeck, ...sideDeck].filter(c => c.id === card.id).length;

    if (currentCopies >= limit) {
      toast({ title: "Limite de Cópias Atingido", description: `Você já possui ${currentCopies} cópias de "${card.name}". O limite é ${limit}.`, variant: "destructive" });
      return;
    }

    const deckMap = {
      main: { deck: mainDeck, setter: setMainDeck, limit: 60, name: "Main Deck" },
      extra: { deck: extraDeck, setter: setExtraDeck, limit: 15, name: "Extra Deck" },
      side: { deck: sideDeck, setter: setSideDeck, limit: 15, name: "Side Deck" },
    };

    const targetDeck = deckMap[section];
    if (targetDeck.deck.length >= targetDeck.limit) {
      toast({ title: "Limite atingido", description: `O ${targetDeck.name} não pode ter mais de ${targetDeck.limit} cartas.`, variant: "destructive" });
      return;
    }

    targetDeck.setter([...targetDeck.deck, card]);
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
    setEditingDeckId(null);
    navigate("/deck-builder");
  };

  const exportDeck = () => {
    if (mainDeck.length === 0 && extraDeck.length === 0 && sideDeck.length === 0) {
      toast({ title: "Deck Vazio", description: "Não há nada para exportar.", variant: "destructive" });
      return;
    }

    const main = '#main\n' + mainDeck.map(c => c.id).join('\n') + '\n';
    const extra = '#extra\n' + extraDeck.map(c => c.id).join('\n') + '\n';
    const side = '!side\n' + sideDeck.map(c => c.id).join('\n') + '\n';
    const fileContent = main + extra + side;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const sanitizedDeckName = deckName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'deck';
    link.download = `${sanitizedDeckName}.ydk`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDeckName(file.name.replace(/\.ydk$/i, ''));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/).map(l => l.trim());

      let currentSection = '';
      const mainIds: string[] = [];
      const extraIds: string[] = [];
      const sideIds: string[] = [];

      for (const line of lines) {
        if (line.startsWith('#main')) { currentSection = 'main'; continue; }
        if (line.startsWith('#extra')) { currentSection = 'extra'; continue; }
        if (line.startsWith('!side')) { currentSection = 'side'; continue; }
        if (!line || line.startsWith('#') || line.startsWith('!')) continue;

        if (currentSection === 'main') mainIds.push(line);
        if (currentSection === 'extra') extraIds.push(line);
        if (currentSection === 'side') sideIds.push(line);
      }

      const allIds = [...new Set([...mainIds, ...extraIds, ...sideIds])];
      if (allIds.length === 0) return;

      try {
        const { data: apiData, error: fetchCardsError } = await supabase
          .from('cards')
          .select('*')
          .in('id', allIds);

        if (fetchCardsError || !apiData) throw new Error("Nenhuma carta encontrada para os IDs importados no banco de dados.");

        const cardDataMap = new Map(apiData.map((c: CardData) => [String(c.id), c]));

        const newMain = mainIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[];
        const newExtra = extraIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[];
        const newSide = sideIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[];

        setMainDeck(newMain);
        setExtraDeck(newExtra);
        setSideDeck(newSide);

        toast({ title: "Sucesso", description: "Deck importado com sucesso." });

      } catch (error: any) {
        toast({ title: "Erro de Importação", description: error.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
      const allCardsToInsert = [
        ...mainDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "main" })),
        ...extraDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "extra" })),
        ...sideDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "side" })),
      ];

      if (editingDeckId) {
        // UPDATE
        const { error: updateError } = await supabase.from('decks').update({ deck_name: deckName.trim(), is_private: isPrivate }).eq('id', editingDeckId);
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase.from('deck_cards').delete().eq('deck_id', editingDeckId);
        if (deleteError) throw deleteError;

        const cardsWithDeckId = allCardsToInsert.map(c => ({ ...c, deck_id: editingDeckId }));
        const { error: insertError } = await supabase.from('deck_cards').insert(cardsWithDeckId);
        if (insertError) throw insertError;

        toast({ title: "Sucesso!", description: `Deck "${deckName.trim()}" atualizado!` });
        navigate(`/profile/${user.id}`);

      } else {
        // CREATE
        const { data: deck, error: deckError } = await supabase
          .from("decks")
          .insert({ user_id: user.id, deck_name: deckName.trim(), is_private: isPrivate })
          .select()
          .single();

        if (deckError) throw deckError;
        if (!deck) throw new Error("Falha ao criar o deck.");

        const cardsWithDeckId = allCardsToInsert.map(c => ({ ...c, deck_id: deck.id }));
        const { error: cardsError } = await supabase.from("deck_cards").insert(cardsWithDeckId);
        if (cardsError) throw cardsError;

        toast({ title: "Sucesso!", description: `Deck "${deckName.trim()}" salvo com sucesso!` });
        navigate(`/profile/${user.id}`);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao Salvar",
        description: error.message || "Ocorreu um problema ao salvar o deck.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando deck para edição...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".ydk" style={{ display: 'none' }} />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-4 mb-6">
          {!user && (
            <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-900/30 p-2 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              Você deve estar logado para salvar um deck.
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportClick}><FileUp className="h-4 w-4 mr-2" /> Importar</Button>
            <Button variant="outline" onClick={exportDeck}><FileDown className="h-4 w-4 mr-2" /> Exportar</Button>
            <Button variant="destructive" onClick={clearDeck}><Trash2 className="h-4 w-4 mr-2" /> Limpar Deck</Button>
            <div className="flex-grow"></div>
            <Button onClick={saveDeck} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editingDeckId ? 'Atualizar Deck' : 'Salvar Deck'}
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
          <div className="flex items-center space-x-2 mt-2">
            <Switch id="is-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
            <Label htmlFor="is-private">Tornar este deck privado?</Label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          
          <div className="w-full md:w-[65%] space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-bold">Main Deck</h2>
                <span className="text-muted-foreground">{mainDeck.length} Cartas</span>
              </div>
              <div className="bg-stone-900 p-4 rounded-lg min-h-[200px]">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {mainDeck.map((card, index) => (
                    <HoverCard key={`${card.id}-${index}`} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="relative group">
                          <img src={card.image_url} alt={card.name} className="w-full" />
                          <BanlistIcon banStatus={card.ban_master_duel} />
                          <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "main")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background">
                        <div className="w-2/5">
                          <img src={card.image_url} alt={card.name} className="w-full" />
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
                          <p className="text-xs border-t border-border pt-2 mt-2 whitespace-pre-wrap h-48 overflow-y-auto">{card.description}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
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
                    <HoverCard key={`${card.id}-${index}`} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="relative group">
                          <img src={card.image_url} alt={card.name} className="w-full" />
                          <BanlistIcon banStatus={card.ban_master_duel} />
                          <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "extra")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background">
                        <div className="w-2/5">
                          <img src={card.image_url} alt={card.name} className="w-full" />
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
                          <p className="text-xs border-t border-border pt-2 mt-2 whitespace-pre-wrap h-48 overflow-y-auto">{card.description}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
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
                    <HoverCard key={`${card.id}-${index}`} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="relative group">
                          <img src={card.image_url} alt={card.name} className="w-full" />
                          <BanlistIcon banStatus={card.ban_master_duel} />
                          <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, "side")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="right" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background">
                        <div className="w-2/5">
                          <img src={card.image_url} alt={card.name} className="w-full" />
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
                          <p className="text-xs border-t border-border pt-2 mt-2 whitespace-pre-wrap h-48 overflow-y-auto">{card.description}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-[35%]">
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
                <span className="text-muted-foreground">
                  Resultados: {searchResults.length}
                </span>
              </div>
              <div className="h-[60vh] overflow-y-auto bg-stone-900/50 p-2 rounded-lg">
                {searchResults.map((card) => {
                  return (
                    <HoverCard key={card.id} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-stone-800 cursor-pointer">
                          <div className="relative">
                            <img src={card.image_url_small} alt={card.name} className="w-12" />
                            <BanlistIcon banStatus={card.ban_master_duel} />
                          </div>
                          <div className="text-sm flex-1 min-w-0">
                            <p className="font-bold truncate">{card.name}</p>
                            {card.pt_name && card.pt_name.toLowerCase() !== card.name.toLowerCase() && (
                              <p className="text-gray-400 truncate text-xs">{card.pt_name}</p>
                            )}
                            <p className="text-muted-foreground text-xs truncate">
                              {card.attribute ? `${card.attribute} / ` : ''}{card.race}{card.level ? ` / Level ${card.level}` : ''}
                            </p>
                            {card.type.includes('Monster') && (
                              <p className="text-muted-foreground text-xs truncate">ATK/{card.atk ?? '?'} / DEF/{card.def ?? '?'}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 ml-2">
                            <Button size="sm" className="h-5 px-2 text-xs" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, 'main')}} disabled={isExtraDeckCard(card.type) || status === 0}>M</Button>
                            <Button size="sm" className="h-5 px-2 text-xs" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, 'extra')}} disabled={!isExtraDeckCard(card.type) || status === 0}>E</Button>
                            <Button size="sm" className="h-5 px-2 text-xs" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, 'side')}} disabled={status === 0}>S</Button>
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent side="left" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background">
                        <div className="w-2/5">
                          <img src={card.image_url} alt={card.name} className="w-full" />
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
                          <p className="text-xs border-t border-border pt-2 mt-2 whitespace-pre-wrap h-48 overflow-y-auto">{card.description}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeckBuilder;