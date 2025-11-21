import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Save, Trash2, FileUp, FileDown, AlertTriangle, ArrowDown, Image, ChevronDown, Info } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

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
  genesys_points?: number;
}

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

const ItemTypes = {
  CARD: 'card',
  DECK_CARD: 'deck_card',
};

const BanlistIcon = ({ banStatus }: { banStatus: string | undefined | null }) => {
  if (!banStatus || banStatus === "Unlimited") {
    return null;
  }

  let imageUrl: string | undefined;
  if (banStatus === "Forbidden") {
    imageUrl = "/ban.png";
  } else if (banStatus === "Limited") {
    imageUrl = "/lim1.png";
  } else if (banStatus === "Semi-Limited") {
    imageUrl = "/lim2.png";
  } else {
    return null;
  }

  const style: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "25px", // Keeping the size consistent with the previous change
    height: "25px",
    backgroundImage: `url('${imageUrl}')`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain", // Use 'contain' to ensure the whole image is visible
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
    width: "30px", // Adjust based on image size
    height: "30px", // Adjust based on image size
    backgroundImage: `url('/genesys_1.png')`,
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain", // Use 'contain' to ensure the whole image is visible
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: "10px", // Adjust font size to fit
    zIndex: 10,
    textShadow: "1px 1px 2px rgba(0,0,0,0.7)",
  };

  return <div style={style}>{points}</div>;
};

const getCardTypeRank = (type: string): number => {
  if (type.includes('Fusion') || type.includes('Synchro') || type.includes('XYZ') || type.includes('Link')) return 0; // Extra Deck Monsters
  if (type.includes('Monster')) return 1; // Main Deck Monsters
  if (type.includes('Spell')) return 2;
  if (type.includes('Trap')) return 3;
  return 4; // Other types
};

const sortCards = (cards: CardData[]): CardData[] => {
  const sorted = [...cards].sort((a, b) => {
    const rankA = getCardTypeRank(a.type);
    const rankB = getCardTypeRank(b.type);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    if (a.id !== b.id) {
      return a.id.localeCompare(b.id);
    }
    return a.name.localeCompare(b.name);
  });
  return sorted;
};

const DraggableSearchResultCard = ({ card, isGenesysMode, addCardToDeck, isExtraDeckCard, isDeckLocked }: { card: CardData, isGenesysMode: boolean, addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, isExtraDeckCard: (type: string) => boolean, isDeckLocked: boolean }) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { card },
    canDrag: !isDeckLocked,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [card, isDeckLocked]);

  const handleRightClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    addCardToDeck(card, 'main');
  }, [card, addCardToDeck]);

  // The main div is the drag source
  return (
    <HoverCard openDelay={200}>
          <HoverCardTrigger asChild>
            <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'move' }} onContextMenu={handleRightClick}>
              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-stone-800">
                {/* The image is the preview */}
                <div className="relative" ref={preview}>
                  <img src={card.image_url_small} alt={card.name} className="w-12" />
                  {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} />}
                  {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
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
                    <p className="text-xs truncate">ATK/{card.atk ?? '?'} / DEF/{card.def ?? '?'}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  <Button size="sm" className="h-5 px-2 text-xs" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, isExtraDeckCard(card.type) ? 'extra' : 'main')}}>Add</Button>
                  <Button size="sm" className="h-5 px-2 text-xs" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, 'side')}}>Side</Button>
                </div>
              </div>
            </div>
          </HoverCardTrigger>
          <HoverCardContent side="right" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background z-[100]">
            <div className="w-2/5"><img src={card.image_url} alt={card.name} className="w-full" /></div>
            <div className="w-3/5 space-y-1">
              <h3 className="font-bold text-md">{card.name}</h3>
              {card.pt_name && <h4 className="text-sm text-gray-300 -mt-1">{card.pt_name}</h4>}
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
};

const DraggableDeckCard = ({ card, index, section, removeCard, isGenesysMode, isDeckLocked }: { card: CardData, index: number, section: "main" | "extra" | "side", removeCard: (index: number, section: "main" | "extra" | "side") => void, isGenesysMode: boolean, isDeckLocked: boolean }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.DECK_CARD, // Changed to DECK_CARD to avoid conflicts
    item: { card, index, section },
    canDrag: !isDeckLocked,
    end: (item, monitor) => {
      if (!monitor.didDrop()) {
        if (!isDeckLocked) {
          removeCard(item.index, item.section);
        }
      }
    },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [card, index, section, removeCard, isDeckLocked]);

  return (
    <HoverCard key={`${card.id}-${index}`} openDelay={200}>
      <HoverCardTrigger asChild>
        <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1, cursor: isDeckLocked ? 'not-allowed' : 'move' }} className="relative group">
          <img src={card.image_url} alt={card.name} className="w-full" />
          {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} />}
          {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
          {!isDeckLocked && (
            <Button size="icon" variant="destructive" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeCard(index, section)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="right" className="w-[500px] flex gap-4 p-3 border-2 border-primary/50 bg-background z-[100]">
        <div className="w-2/5"><img src={card.image_url} alt={card.name} className="w-full" /></div>
        <div className="w-3/5 space-y-1">
          <h3 className="font-bold text-md">{card.name}</h3>
          {card.pt_name && <h4 className="text-sm text-gray-300 -mt-1">{card.pt_name}</h4>}
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
};

const DeckDropZone = ({ section, children, addCardToDeck, isExtraDeckCard, removeCard, isDeckLocked }: { section: 'main' | 'extra' | 'side', children: React.ReactNode, addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, isExtraDeckCard: (type: string) => boolean, removeCard: (index: number, section: 'main' | 'extra' | 'side') => void, isDeckLocked: boolean }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.CARD, ItemTypes.DECK_CARD],
    drop: (item: { card: CardData, index?: number, section?: 'main' | 'extra' | 'side' }) => {
        if (isDeckLocked) return;
        const targetSection = isExtraDeckCard(item.card.type) ? 'extra' : 'main';
        if (item.type === ItemTypes.DECK_CARD && item.section && item.index !== undefined) {
            // Moving card from one deck section to another
            removeCard(item.index, item.section);
            addCardToDeck(item.card, section); // Add to the current drop zone's section
        } else {
            // Adding card from search results
            if (section === 'side') {
                addCardToDeck(item.card, 'side');
            } else {
                addCardToDeck(item.card, targetSection);
            }
        }
    },
    canDrop: (item: { card: CardData, index?: number, section?: 'main' | 'extra' | 'side' }) => {
        if (isDeckLocked) return false;
        // Prevent dropping a card onto its own section if it's already there
        if (item.type === ItemTypes.DECK_CARD && item.section === section) {
            return false;
        }
        // Logic for extra deck cards
        if (section === 'extra' && !isExtraDeckCard(item.card.type)) return false;
        if (section === 'main' && isExtraDeckCard(item.card.type)) return false;
        if (section === 'side' && isExtraDeckCard(item.card.type) && item.type === ItemTypes.CARD) return true; // Allow extra deck cards to be added to side from search
        if (section === 'side' && !isExtraDeckCard(item.card.type) && item.type === ItemTypes.CARD) return true; // Allow main deck cards to be added to side from search
        return true;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [addCardToDeck, isExtraDeckCard, section, removeCard, isDeckLocked]);

  const isActive = isOver && canDrop;
  let backgroundColor = 'transparent';
  if (isActive) {
    backgroundColor = 'rgba(0, 255, 0, 0.1)';
  } else if (canDrop) {
    backgroundColor = 'rgba(0, 0, 255, 0.1)';
  }

  return (
    <div ref={drop} style={{ backgroundColor }} className="rounded-lg transition-colors">
      {children}
    </div>
  );
};


const instructions = `# 📥 Como Exportar e Enviar seu Deck

Para enviar seus decks do **Master Duel** ou **Neuron** para o nosso site, você precisará do código do deck (formato YDKE) ou do arquivo \`.ydk\`.

Siga o guia abaixo dependendo do seu dispositivo.

---

## 🖥️ Método 1: Computador (PC)

A maneira mais fácil de extrair o deck é utilizando o navegador Google Chrome e uma extensão específica.

### Passo 1: Instale a Extensão
Primeiro, adicione a extensão **Deck Transfer for Yu-Gi-Oh!** ao seu navegador:

🔗 **[Clique aqui para baixar a extensão na Chrome Web Store](https://chromewebstore.google.com/detail/deck-transfer-for-yu-gi-o/lgcpomfflpfipndmldmgblhpbnnfidgk)**

### Passo 2: Sincronize sua conta
1. Abra o seu jogo **Yu-Gi-Oh! Master Duel** ou o app **Neuron**.
2. Certifique-se de que sua conta está vinculada a uma **Konami ID** (No Master Duel: *Submenu > Customer Support > Data Transfer*).

### Passo 3: Exporte o Deck
1. Acesse o site oficial do **[Yu-Gi-Oh! Card Database](https://www.db.yugioh-card.com/yugiohdb/)** e faça login com sua Konami ID.
2. Vá até a aba **"My Decks"** (Meus Decks). Você verá os decks que criou no Master Duel ou no Neuron.
3. Abra o deck que deseja exportar.
4. Com a extensão instalada, você verá novos botões na página do deck:
   * **Export YDKE:** Copia um código de texto para sua área de transferência.
   * **Download YDK:** Baixa o arquivo do deck para seu computador.
5. **Copie o código YDKE** ou faça o upload do arquivo aqui no site.

---

## 📱 Método 2: Celular (Android e iOS)

Os navegadores padrão de celular (Chrome Mobile, Safari) não suportam extensões de PC. Para contornar isso, recomendamos o uso do **Kiwi Browser** no Android.

### Opção A: Android (Via Kiwi Browser)
O navegador **Kiwi Browser** permite instalar extensões do Chrome no celular.

1. Baixe o app **Kiwi Browser** na Play Store.
2. Abra o Kiwi e acesse o link da extensão: **[Deck Transfer for Yu-Gi-Oh!](https://chromewebstore.google.com/detail/deck-transfer-for-yu-gi-o/lgcpomfflpfipndmldmgblhpbnnfidgk)**.
3. Clique em **"Usar no Chrome"** para instalar.
4. Pelo Kiwi, acesse o site **[Yu-Gi-Oh! Card Database](https://www.db.yugioh-card.com/yugiohdb/)** e faça login.
5. Vá em **My Decks**, abra o deck desejado e use os botões da extensão que aparecerão na tela para copiar o **YDKE** ou baixar o **YDK**.

### Opção B: Apenas App Neuron (iOS/Android)
Se você não conseguir usar o Kiwi Browser:

1. Abra o app **Yu-Gi-Oh! Neuron**.
2. Vincule o app à sua **Konami ID** (Menu Dados > Konami ID).
3. Acesse o site **[Yu-Gi-Oh! Card Database](https://www.db.yugioh-card.com/yugiohdb/)** pelo navegador do seu celular.
4. Vá em **My Decks**.
5. Infelizmente, sem a extensão, você não terá o botão de exportação direta, mas poderá visualizar a lista completa para conferência. Para obter o arquivo, recomendamos acessar o site pelo PC posteriormente.

---

> **💡 Dica:** O formato **YDKE** é uma sequência de texto (ex: \`ydke://...\`). É o método mais rápido para colar diretamente no nosso formulário de envio!`;

const DeckBuilderInternal = ({ user, onLogout }: DeckBuilderProps) => {
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
  const [isGenesysMode, setIsGenesysMode] = useState(false);
  const [totalGenesysPoints, setTotalGenesysPoints] = useState(0);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isDeckLocked, setIsDeckLocked] = useState(false);

  useEffect(() => {
    const calculatePoints = () => {
      const allCards = [...mainDeck, ...extraDeck, ...sideDeck];
      const total = allCards.reduce((sum, card) => sum + (card.genesys_points || 0), 0);
      setTotalGenesysPoints(total);
    };
    calculatePoints();
  }, [mainDeck, extraDeck, sideDeck]);

  const isExtraDeckCard = (type: string) => 
    type.includes("Fusion") || type.includes("Synchro") || type.includes("XYZ") || type.includes("Link");

  const loadDeckForEditing = useCallback(async (deckId: number) => {
    setIsLoadingDeck(true);
    try {
      // Check for tournament lock first
      const { data: tournamentDecks, error: tournamentError } = await supabase
        .from('tournament_decks')
        .select('tournaments(event_date)')
        .eq('deck_id', deckId);

      if (tournamentError) throw new Error(tournamentError.message);

      const now = new Date();
      for (const entry of tournamentDecks) {
        if (entry.tournaments && new Date(entry.tournaments.event_date) <= now) {
          setIsDeckLocked(true);
          // Removed toast notification as requested
          break;
        }
      }

      const { data: deckData, error: deckError } = await supabase.from('decks').select('*, profiles(*)').eq('id', deckId).single();
      if (deckError || !deckData) throw new Error("Deck para edição não encontrado.");
      if (deckData.user_id !== user?.id) throw new Error("Você não tem permissão para editar este deck.");

      setDeckName(deckData.deck_name);
      setIsPrivate(deckData.is_private);
      setEditingDeckId(deckId);

      const { data: deckCards, error: cardsError } = await supabase.from('deck_cards').select('card_api_id, deck_section').eq('deck_id', deckId);
      if (cardsError) throw new Error(cardsError.message);
      if (!deckCards) { setIsLoadingDeck(false); return; }

      const allIds = [...new Set(deckCards.map(c => c.card_api_id))].filter(Boolean);
      if (allIds.length === 0) { setIsLoadingDeck(false); return; }

      const { data: apiData, error: fetchCardsError } = await supabase.from('cards').select('*').in('id', allIds);
      if (fetchCardsError || !apiData) throw new Error("Erro ao buscar dados das cartas no banco de dados.");

      const cardDataMap = new Map(apiData.map((c: CardData) => [String(c.id), c]));
      const newMain = deckCards.filter(dc => dc.deck_section === 'main').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];
      const newExtra = deckCards.filter(dc => dc.deck_section === 'extra').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];
      const newSide = deckCards.filter(dc => dc.deck_section === 'side').map(dc => cardDataMap.get(String(dc.card_api_id))).filter(Boolean) as CardData[];

      setMainDeck(newMain);
      setExtraDeck(newExtra);
      setSideDeck(newSide);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Erro ao Carregar Deck", description: errorMessage, variant: "destructive" });
      navigate("/deck-builder");
    } finally {
      setIsLoadingDeck(false);
    }
  }, [user, navigate, toast]);

  useEffect(() => {
    const deckId = searchParams.get('edit');
    if (deckId && user) {
      loadDeckForEditing(Number(deckId));
    } else {
      setIsLoadingDeck(false);
    }
  }, [searchParams, user, loadDeckForEditing]);

  const searchCards = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;
    setIsSearching(true);
    try {
      const { data: cards, error } = await supabase.from('cards').select('*').or(`name.ilike.%${trimmedQuery.toLowerCase()}%,pt_name.ilike.%${trimmedQuery.toLowerCase()}%`).limit(50);
      if (error) throw error;
      cards.sort((a, b) => {
        const rankA = getCardTypeRank(a.type);
        const rankB = getCardTypeRank(b.type);
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
      setSearchResults(cards || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao buscar cartas";
      toast({ title: "Erro", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (card: CardData, section: 'main' | 'extra' | 'side') => {
    let limit = 3;
    if (!isGenesysMode) {
      const status = card.ban_master_duel;
      if (status === "Forbidden") {
        toast({ title: "Carta Banida", description: `"${card.name}" é proibida.`, variant: "destructive" });
        return;
      }
      if (status === "Limited") limit = 1;
      if (status === "Semi-Limited") limit = 2;
    }

    const currentCopies = [...mainDeck, ...extraDeck, ...sideDeck].filter(c => c.id === card.id).length;
    if (currentCopies >= limit) {
      toast({ title: "Limite de Cópias", description: `Você já possui ${currentCopies} de "${card.name}". O limite é ${limit}.`, variant: "destructive" });
      return;
    }

    const deckMap = {
      main: { deck: mainDeck, setter: setMainDeck, limit: 60, name: "Main Deck" },
      extra: { deck: extraDeck, setter: setExtraDeck, limit: 15, name: "Extra Deck" },
      side: { deck: sideDeck, setter: setSideDeck, limit: 15, name: "Side Deck" },
    };

    const targetSection = isExtraDeckCard(card.type) && section !== 'side' ? 'extra' : section;
    const targetDeck = deckMap[targetSection];

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

  const handleSortDeck = () => {
    setMainDeck(sortCards(mainDeck));
    setExtraDeck(sortCards(extraDeck));
    setSideDeck(sortCards(sideDeck));
    toast({ title: "Deck Reordenado", description: "As cartas foram reordenadas." });
  };

  const exportDeck = () => {
    if (mainDeck.length === 0 && extraDeck.length === 0 && sideDeck.length === 0) {
      toast({ title: "Deck Vazio", variant: "destructive" });
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

  const handleExportAsImage = async () => {
    const deckElement = document.getElementById('deck-for-export');
    if (deckElement) {
      setIsExportingImage(true);
      const originalSrcs = new Map<HTMLImageElement, string>();
      try {
        const { data: { publicUrl } } = supabase.storage.from('card_images').getPublicUrl('dummy.jpg');
        const baseUrl = publicUrl.replace('dummy.jpg', '');

        const images = Array.from(deckElement.getElementsByTagName('img'));
        await Promise.all(images.map(async (img) => {
          originalSrcs.set(img, img.src);
          // Extract card ID from the original src (assuming it's in the format like .../cards/{id}.jpg or .../cards/{id}_small.jpg)
          const match = img.src.match(/(\d+)(?:_small)?\.jpg$/);
          if (match && match[1]) {
            const cardId = match[1];
            img.src = `${baseUrl}${cardId}.jpg`;
          }
        }));

        const canvas = await html2canvas(deckElement, {
          backgroundColor: null,
          useCORS: true,
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        const sanitizedDeckName = deckName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'deck';
        link.download = `${sanitizedDeckName}.png`;
        link.href = image;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error exporting image:", error);
        toast({
          title: "Erro ao Exportar Imagem",
          description: "Ocorreu um erro ao tentar exportar o deck como imagem.",
          variant: "destructive",
        });
      } finally {
        originalSrcs.forEach((src, img) => {
          img.src = src;
        });
        setIsExportingImage(false);
      }
    }
  };

  const handleImportYdkClick = () => fileInputRef.current?.click();

  const handleYdkeImport = async () => {
    try {
      let ydkeString = await navigator.clipboard.readText();
      ydkeString = ydkeString.trim();

      if (!ydkeString.startsWith("ydke://")) {
        toast({ title: "Código YDKE Inválido", description: "O conteúdo da área de transferência não é um código YDKE válido.", variant: "destructive" });
        return;
      }

      const [mainB64, extraB64, sideB64] = ydkeString.substring(7).split('!');

      const decodeB64 = (b64: string | undefined) => {
          if (!b64) return [];
          const decoded = atob(b64);
          const bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
              bytes[i] = decoded.charCodeAt(i);
          }
          const dataView = new DataView(bytes.buffer);
          const cardIds = [];
          for (let i = 0; i < bytes.length; i += 4) {
              cardIds.push(dataView.getUint32(i, true));
          }
          return cardIds;
      }

      const mainIds = decodeB64(mainB64);
      const extraIds = decodeB64(extraB64);
      const sideIds = decodeB64(sideB64);

      const allIds = [...new Set([...mainIds, ...extraIds, ...sideIds])];

      if (allIds.length === 0) return;

      const { data: apiData, error: fetchCardsError } = await supabase.from('cards').select('*').in('id', allIds);
      if (fetchCardsError || !apiData) throw new Error("Nenhuma carta encontrada para os IDs importados do YDKE.");

      const cardDataMap = new Map(apiData.map((c: CardData) => [String(c.id), c]));
      
      setMainDeck(mainIds.map(id => cardDataMap.get(String(id))).filter(Boolean) as CardData[]);
      setExtraDeck(extraIds.map(id => cardDataMap.get(String(id))).filter(Boolean) as CardData[]);
      setSideDeck(sideIds.map(id => cardDataMap.get(String(id))).filter(Boolean) as CardData[]);
      
      toast({ title: "Sucesso", description: "Deck importado a partir do código YDKE." });

    } catch (error) {
      console.error("Failed to read clipboard or parse YDKE:", error);
      const errorMessage = error instanceof Error ? error.message : "Falha ao importar do YDKE. Verifique o console para mais detalhes.";
      toast({ title: "Erro de Importação YDKE", description: errorMessage, variant: "destructive" });
    }
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
      const mainIds: string[] = [], extraIds: string[] = [], sideIds: string[] = [];
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
        const { data: apiData, error: fetchCardsError } = await supabase.from('cards').select('*').in('id', allIds);
        if (fetchCardsError || !apiData) throw new Error("Nenhuma carta encontrada para os IDs importados.");
        const cardDataMap = new Map(apiData.map((c: CardData) => [String(c.id), c]));
        setMainDeck(mainIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[]);
        setExtraDeck(extraIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[]);
        setSideDeck(sideIds.map(id => cardDataMap.get(id)).filter(Boolean) as CardData[]);
        toast({ title: "Sucesso", description: "Deck importado." });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast({ title: "Erro de Importação", description: errorMessage, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const saveDeck = async () => {
    if (!user) { toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" }); return; }
    if (!deckName.trim()) { toast({ title: "Erro", description: "Digite um nome para o deck.", variant: "destructive" }); return; }
    if (mainDeck.length < 40) { toast({ title: "Erro", description: "O Main Deck precisa ter no mínimo 40 cartas.", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const allCardsToInsert = [
        ...mainDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "main" })),
        ...extraDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "extra" })),
        ...sideDeck.map((card) => ({ card_api_id: String(card.id), deck_section: "side" })),
      ];
      if (editingDeckId) {
        const { error: updateError } = await supabase.from('decks').update({ deck_name: deckName.trim(), is_private: isPrivate, is_genesys: isGenesysMode }).eq('id', editingDeckId);
        if (updateError) throw updateError;
        const { error: deleteError } = await supabase.from('deck_cards').delete().eq('deck_id', editingDeckId);
        if (deleteError) throw deleteError;
        const cardsWithDeckId = allCardsToInsert.map(c => ({ ...c, deck_id: editingDeckId }));
        const { error: insertError } = await supabase.from('deck_cards').insert(cardsWithDeckId);
        if (insertError) throw insertError;
        toast({ title: "Sucesso!", description: `Deck "${deckName.trim()}" atualizado!` });
        navigate(`/profile/${user.id}`);
      } else {
        const { data: deck, error: deckError } = await supabase.from("decks").insert({ user_id: user.id, deck_name: deckName.trim(), is_private: isPrivate, is_genesys: isGenesysMode }).select().single();
        if (deckError) throw deckError;
        if (!deck) throw new Error("Falha ao criar o deck.");
        const cardsWithDeckId = allCardsToInsert.map(c => ({ ...c, deck_id: deck.id }));
        const { error: cardsError } = await supabase.from("deck_cards").insert(cardsWithDeckId);
        if (cardsError) throw cardsError;
        toast({ title: "Sucesso!", description: `Deck "${deckName.trim()}" salvo!` });
        navigate(`/profile/${user.id}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ title: "Erro ao Salvar", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Carregando deck...</p>
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
          {isDeckLocked && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-900/30 p-3 rounded-md mb-4">
              <AlertTriangle className="h-4 w-4" />
              Este deck está travado e não pode ser editado pois está vinculado a um torneio que já começou.
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isDeckLocked}>
                  <FileUp className="h-4 w-4 mr-2" />
                  Importar
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleImportYdkClick} disabled={isDeckLocked}>Importar YDK</DropdownMenuItem>
                <DropdownMenuItem onClick={handleYdkeImport} disabled={isDeckLocked}>Importar YDKE</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" onClick={exportDeck}><FileDown className="h-4 w-4 mr-2" /> Exportar</Button>

            <Button variant="outline" onClick={exportDeck}><FileDown className="h-4 w-4 mr-2" /> Exportar</Button>
            <Button variant="outline" onClick={handleSortDeck} disabled={isDeckLocked}><ArrowDown className="h-4 w-4 mr-2" /> Re-ordenar</Button>
            <Button variant="outline" onClick={handleExportAsImage} disabled={isExportingImage}>
              {isExportingImage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Image className="h-4 w-4 mr-2" />}
              Exportar como Imagem
            </Button>
            <Button variant="destructive" onClick={clearDeck} disabled={isDeckLocked}><Trash2 className="h-4 w-4 mr-2" /> Limpar</Button>
            <div className="flex-grow md:flex-grow-0"></div>
            <Button onClick={saveDeck} disabled={isSaving || isDeckLocked} className="bg-blue-600 hover:bg-blue-700 md:ml-auto mt-2 md:mt-0">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isDeckLocked ? "Deck Travado" : (editingDeckId ? 'Atualizar Deck' : 'Salvar Deck')}
            </Button>
          </div>
          <div>
            <Label htmlFor="deck-name" className="text-sm font-bold mb-2 block">Deck Name</Label>
            <Input id="deck-name" placeholder="Dê um nome ao seu Deck" className="text-lg" value={deckName} onChange={(e) => setDeckName(e.target.value)} disabled={isDeckLocked} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex-1 flex justify-start">
              <div className="flex items-center space-x-2">
                <Switch id="is-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
                <Label htmlFor="is-private">Tornar Deck Privado</Label>
              </div>
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center space-x-2">
                <Switch id="genesys-mode" checked={isGenesysMode} onCheckedChange={setIsGenesysMode} />
                <Label htmlFor="genesys-mode">Modo Genesys</Label>
              </div>
            </div>
            <div className="flex-1 flex justify-end">
              <div className={`text-lg font-bold ${!isGenesysMode ? 'invisible' : ''}`}>
                Pontos Genesys: <span className="text-violet-400">{totalGenesysPoints}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-[35%] order-1 md:order-2">
            <div className="sticky top-24 space-y-4 z-0">
              <div className="flex gap-2">
                <Input id="search" placeholder="Buscar pelo nome da carta..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCards()} disabled={isDeckLocked} />
                <Button onClick={searchCards} disabled={isSearching || isDeckLocked}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 border-0">Filtrar</Button>
                <select className="bg-background border border-border rounded-md p-2">
                  <option>Nome</option>
                  <option>Nível</option>
                  <option>ATK</option>
                </select>
                <span className="text-muted-foreground">
                  Resultados: {searchResults.length}
                </span>
              </div>
              <div className="h-[60vh] rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/bg-main.png')" }}>
                <div className="h-full overflow-y-auto bg-stone-900/50 p-2 rounded-lg">
                  {searchResults.map((card, index) => (
                    <DraggableSearchResultCard key={`${card.id}-${index}`} card={card} isGenesysMode={isGenesysMode} addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} isDeckLocked={isDeckLocked} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div id="deck-for-export" className="w-full md:w-[65%] space-y-6 order-2 md:order-1">
            <DeckDropZone section="main" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
              <div>
                                                <div className="flex justify-between items-center mb-2">
                                                  <h2 className="text-xl font-bold">Main Deck</h2>
                                                  <Dialog>
                                                    <DialogTrigger asChild>
                                                      <span className="text-sm text-blue-400 hover:underline cursor-pointer">
                                                        Como exportar meu deck do Master Duel?
                                                      </span>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                                      <DialogHeader>
                                                        <DialogTitle>Como Exportar e Enviar seu Deck</DialogTitle>
                                                      </DialogHeader>
                                                                                                  <div className="prose prose-invert max-w-none prose-a:text-blue-400 hover:prose-a:text-blue-500">
                                                                                                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                                                                                                      {instructions}
                                                                                                    </ReactMarkdown>
                                                                                                  </div>                                                      </DialogContent>
                                                    </Dialog>
                                                  <span className="text-muted-foreground">{mainDeck.length} Cartas</span>
                                                </div>                <div className="rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/bg-main.png')" }}>
                  <div className="bg-stone-900/50 p-4 rounded-lg min-h-[200px]">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {mainDeck.map((card, index) => (
                        <DraggableDeckCard
                          key={`${card.id}-${index}`}
                          card={card}
                          index={index}
                          section="main"
                          removeCard={removeCard}
                          isGenesysMode={isGenesysMode}
                          isDeckLocked={isDeckLocked}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DeckDropZone>

            <DeckDropZone section="extra" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold">Extra Deck</h2>
                  <span className="text-muted-foreground">{extraDeck.length} Cartas</span>
                </div>
                <div className="rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/bg-main.png')" }}>
                  <div className="bg-indigo-950/50 p-4 rounded-lg min-h-[100px]">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {extraDeck.map((card, index) => (
                        <DraggableDeckCard
                          key={`${card.id}-${index}`}
                          card={card}
                          index={index}
                          section="extra"
                          removeCard={removeCard}
                          isGenesysMode={isGenesysMode}
                          isDeckLocked={isDeckLocked}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DeckDropZone>

            <DeckDropZone section="side" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-bold">Side Deck</h2>
                  <span className="text-muted-foreground">{sideDeck.length} Cartas</span>
                </div>
                <div className="rounded-lg bg-cover bg-center" style={{ backgroundImage: "url('/bg-main.png')" }}>
                  <div className="bg-emerald-950/50 p-4 rounded-lg min-h-[100px]">
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {sideDeck.map((card, index) => (
                        <DraggableDeckCard
                          key={`${card.id}-${index}`}
                          card={card}
                          index={index}
                          section="side"
                          removeCard={removeCard}
                          isGenesysMode={isGenesysMode}
                          isDeckLocked={isDeckLocked}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </DeckDropZone>
          </div>
        </div>
      </main>
    </div>
  );
};

const DeckBuilder = (props: DeckBuilderProps) => (
  <DndProvider backend={HTML5Backend}>
    <DeckBuilderInternal {...props} />
  </DndProvider>
);

export default DeckBuilder;
