import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToastAction } from "@/components/ui/toast";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, Save, Trash2, FileUp, FileDown, AlertTriangle, ArrowDown, Image, ChevronDown, Info, RotateCcw, Filter, ArrowUpDown, PlusCircle, PenTool, Layout, Wand2, Shuffle, Eraser, Download, Share2, Plus, Eye, EyeOff } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const CARD_TYPE_GROUPS = {
  "Monstros de Efeito": ["Effect Monster", "Flip Effect Monster", "Tuner Monster", "Pendulum Effect Monster"],
  "Monstros Normais": ["Normal Monster", "Normal Tuner Monster", "Pendulum Normal Monster"],
  "Monstros de Ritual": ["Ritual Monster", "Ritual Effect Monster"],
  "Monstros de Fusão": ["Fusion Monster"],
  "Monstros de Sincro": ["Synchro Monster", "Synchro Tuner Monster", "Synchro Pendulum Effect Monster"],
  "Monstros Xyz": ["XYZ Monster", "XYZ Pendulum Effect Monster"],
  "Monstros Link": ["Link Monster"],
  "Spells": ["Spell Card"],
  "Traps": ["Trap Card"],
};

const ATTRIBUTES = ["LIGHT", "DARK", "WATER", "FIRE", "EARTH", "WIND", "DIVINE"];

const MONSTER_RACES = [
  "Aqua", "Beast", "Beast-Warrior", "Creator-God", "Cyberse", "Dinosaur", "Divine-Beast", 
  "Dragon", "Fairy", "Fiend", "Fish", "Insect", "Machine", "Plant", "Psychic", 
  "Pyro", "Reptile", "Rock", "Sea Serpent", "Spellcaster", "Thunder", "Warrior", 
  "Winged Beast", "Wyrm", "Zombie"
];

const SPELL_RACES = [
  "Normal", "Field", "Equip", "Continuous", "Quick-Play", "Ritual"
];

const TRAP_RACES = ["Normal", "Continuous", "Counter"];

const instructions = `# 📥 Como Exportar e Enviar seu Deck

Para enviar seus decks do **Master Duel** ou **Neuron** para o nosso site, você precisará do código do deck (formato YDKE) ou do arquivo ".ydk".

---

## 🖥️ Método 1: Computador (PC)

1. Instale a extensão **Deck Transfer for Yu-Gi-Oh!** no Chrome.
2. Acesse o **[Yu-Gi-Oh! Card Database](https://www.db.yugioh-card.com/yugiohdb/)**.
3. Abra o deck e use os botões extras para copiar o **YDKE**.

## 📱 Método 2: Celular

1. No Android, use o **Kiwi Browser** para instalar a extensão do Chrome.
2. No iOS, use o app **Neuron** vinculado à sua Konami ID e acesse o Database pelo navegador.

> **💡 Dica:** O formato **YDKE** é o método mais rápido para colar diretamente no formulário!`;

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
  genesys_points?: number;
  md_rarity?: string | null;
}

interface DeckBuilderProps {
  user: User | null;
  onLogout: () => void;
}

const ItemTypes = {
  CARD: 'card',
  DECK_CARD: 'deck_card',
};

const RarityIcon = ({ rarity }: { rarity: string | undefined | null }) => {
  if (!rarity) return null;
  
  const rarityColors: Record<string, string> = {
    "Normal": "bg-stone-500",
    "Rare": "bg-blue-500",
    "Super Rare": "bg-zinc-300 text-black",
    "Ultra Rare": "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]"
  };

  const labels: Record<string, string> = {
    "Normal": "N",
    "Rare": "R",
    "Super Rare": "SR",
    "Ultra Rare": "UR"
  };

  return (
    <div className={cn(
      "absolute top-1 right-1 px-1 rounded-[2px] text-[8px] font-black z-20 pointer-events-none uppercase tracking-tighter",
      rarityColors[rarity] || "bg-stone-500"
    )}>
      {labels[rarity] || rarity}
    </div>
  );
};

const BanlistIcon = ({ banStatus }: { banStatus: string | undefined | null }) => {
  if (!banStatus || banStatus === "Unlimited") return null;
  let imageUrl: string | undefined;
  if (banStatus === "Forbidden" || banStatus === "Banned") imageUrl = "/ban.png";
  else if (banStatus === "Limited") imageUrl = "/lim1.png";
  else if (banStatus === "Semi-Limited") imageUrl = "/lim2.png";
  else return null;

  return <div className="absolute top-1 left-1 w-5 h-5 z-20 pointer-events-none drop-shadow-md">
    <img src={imageUrl} alt={banStatus} className="w-full h-full object-contain" />
  </div>;
};

const GenesysPointBadge = ({ points }: { points: number | undefined | null }) => {
  if (!points || points === 0) return null;
  return (
    <div className="absolute bottom-1 right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-[10px] font-black text-white z-20 border border-white/20 shadow-lg">
      {points}
    </div>
  );
};

const getCardTypeRank = (card: CardData): number => {
  const { type, race } = card;
  if (type.includes('Fusion') || type.includes('Synchro') || type.includes('XYZ') || type.includes('Link')) return 100;
  if (type.includes("Normal Monster")) return 0;
  if (type.includes("Effect Monster") || type.includes("Flip Effect Monster") || type.includes("Tuner Monster")) return 1;
  if (type.includes("Ritual Monster")) return 2;
  if (type.includes("Pendulum")) return 3;
  if (type.includes("Monster")) return 4;
  if (type === "Spell Card") {
    if (race === "Normal") return 5;
    if (race === "Quick-Play") return 6;
    if (race === "Continuous") return 7;
    return 8;
  }
  if (type === "Trap Card") {
    if (race === "Normal") return 9;
    if (race === "Counter") return 10;
    if (race === "Continuous") return 11;
    return 12;
  }
  return 99;
};

const sortCards = (cards: CardData[]): CardData[] => {
  return [...cards].sort((a, b) => {
    const rankA = getCardTypeRank(a);
    const rankB = getCardTypeRank(b);
    if (rankA !== rankB) return rankA - rankB;
    if (a.type.includes('Monster') && b.type.includes('Monster')) {
      const levelA = a.level ?? Infinity;
      const levelB = b.level ?? Infinity;
      if (levelA !== levelB) return levelA - levelB;
    }
    if (a.id !== b.id) return a.id.localeCompare(b.id);
    return a.name.localeCompare(b.name);
  });
};

const CardPreviewContent = ({ card }: { card: CardData }) => (
  <div className="flex gap-4 p-4">
    <div className="w-40 shrink-0">
      <img src={card.image_url} alt={card.name} className="w-full rounded-md shadow-2xl border border-white/10" />
    </div>
    <div className="flex-1 space-y-2 min-w-0">
      <div>
        <h3 className="text-xl font-black uppercase italic tracking-tighter text-primary">{card.name}</h3>
        {card.pt_name && <h4 className="text-sm text-muted-foreground font-medium">{card.pt_name}</h4>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary font-bold">
          {card.race}
        </Badge>
        <Badge variant="outline" className="bg-stone-800 border-stone-700">
          {card.type}
        </Badge>
        {card.attribute && (
          <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-500">
            {card.attribute}
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5">
        {card.level !== undefined && (
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-black">Level</p>
            <p className="font-bold text-lg">{card.level}</p>
          </div>
        )}
        {card.atk !== undefined && (
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-black">ATK</p>
            <p className="font-bold text-lg text-red-400">{card.atk}</p>
          </div>
        )}
        {card.def !== undefined && (
          <div className="text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-black">DEF</p>
            <p className="font-bold text-lg text-blue-400">{card.def}</p>
          </div>
        )}
      </div>
      <ScrollArea className="h-32 text-sm text-stone-300 leading-relaxed whitespace-pre-wrap italic">
        {card.description}
      </ScrollArea>
    </div>
  </div>
);

const DraggableSearchResultCard = ({ card, isGenesysMode, addCardToDeck, isExtraDeckCard, isDeckLocked }: { card: CardData, isGenesysMode: boolean, addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, isExtraDeckCard: (type: string) => boolean, isDeckLocked: boolean }) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({ type: ItemTypes.CARD, item: { card }, canDrag: !isDeckLocked, collect: (monitor) => ({ isDragging: !!monitor.isDragging() }) }), [card, isDeckLocked]);
  const handleRightClick = useCallback((event: React.MouseEvent) => { event.preventDefault(); addCardToDeck(card, 'main'); }, [card, addCardToDeck]);

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          ref={drag} 
          className={cn(
            "group relative flex items-center gap-3 p-2 rounded-lg transition-all border border-transparent hover:border-primary/30 hover:bg-white/5 cursor-grab active:cursor-grabbing",
            isDragging && "opacity-50"
          )}
          onContextMenu={handleRightClick}
        >
          <div className="relative shrink-0" ref={preview}>
            <img src={card.image_url_small} alt={card.name} className="w-12 rounded shadow-lg group-hover:scale-105 transition-transform" />
            {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} />}
            {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
            <RarityIcon rarity={card.md_rarity} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-xs uppercase truncate tracking-tighter group-hover:text-primary transition-colors">{card.name}</p>
            <p className="text-[10px] text-muted-foreground truncate italic">{card.race} / {card.type}</p>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, isExtraDeckCard(card.type) ? 'extra' : 'main')}}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-[500px] p-0 bg-[#121212] border-primary/30 shadow-2xl z-[100]">
        <CardPreviewContent card={card} />
      </HoverCardContent>
    </HoverCard>
  );
};

const PopularCardGridItem = ({ card, isGenesysMode, addCardToDeck, isExtraDeckCard, isDeckLocked }: { card: CardData, isGenesysMode: boolean, addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, isExtraDeckCard: (type: string) => boolean, isDeckLocked: boolean }) => {
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

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          ref={drag} 
          className={cn(
            "relative aspect-[2/3] rounded-md overflow-hidden cursor-grab active:cursor-grabbing group border border-white/5 hover:border-primary/50 transition-all",
            isDragging && "opacity-50"
          )}
          onContextMenu={handleRightClick}
        >
          <img src={card.image_url_small} alt={card.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" ref={preview} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} />}
          {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
          <RarityIcon rarity={card.md_rarity} />
          
          {!isDeckLocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-end p-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
              <div className="flex gap-1 w-full">
                <Button size="sm" className="flex-1 h-7 bg-primary text-black font-black text-[10px]" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, isExtraDeckCard(card.type) ? 'extra' : 'main')}}>
                  ADD
                </Button>
                <Button size="icon" variant="secondary" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); addCardToDeck(card, 'side')}}>
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-[500px] p-0 bg-[#121212] border-primary/30 shadow-2xl z-[100]">
        <CardPreviewContent card={card} />
      </HoverCardContent>
    </HoverCard>
  );
};


const DraggableDeckCard = ({ card, index, section, removeCard, isGenesysMode, isDeckLocked }: { card: CardData, index: number, section: "main" | "extra" | "side", removeCard: (index: number, section: "main" | "extra" | "side") => void, isGenesysMode: boolean, isDeckLocked: boolean }) => {
  const [{ isDragging }, drag] = useDrag(() => ({ type: ItemTypes.DECK_CARD, item: { card, index, section }, canDrag: !isDeckLocked, end: (item, monitor) => { if (!monitor.didDrop() && !isDeckLocked) { removeCard(item.index, item.section); } }, collect: (monitor) => ({ isDragging: !!monitor.isDragging() }) }), [card, index, section, removeCard, isDeckLocked]);
  
  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          ref={drag} 
          className={cn(
            "relative aspect-[2/3] rounded shadow-md cursor-grab active:cursor-grabbing group hover:ring-2 hover:ring-primary/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all",
            isDragging && "opacity-0"
          )}
        >
          <img src={card.image_url_small} alt={card.name} className="w-full h-full object-cover rounded" />
          {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} />}
          {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
          <RarityIcon rarity={card.md_rarity} />
          
          {!isDeckLocked && (
            <Button 
              size="icon" 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 z-30 shadow-lg scale-75 group-hover:scale-100 transition-all" 
              onClick={() => removeCard(index, section)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-[500px] p-0 bg-[#121212] border-primary/30 shadow-2xl z-[100]">
        <CardPreviewContent card={card} />
      </HoverCardContent>
    </HoverCard>
  );
};

const DeckDropZone = ({ section, children, addCardToDeck, isExtraDeckCard, removeCard, isDeckLocked }: { section: 'main' | 'extra' | 'side', children: React.ReactNode, addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, isExtraDeckCard: (type: string) => boolean, removeCard: (index: number, section: 'main' | 'extra' | 'side') => void, isDeckLocked: boolean }) => {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.CARD, ItemTypes.DECK_CARD],
    drop: (item: any) => {
      if (isDeckLocked) return;
      if (item.section && item.index !== undefined) {
        removeCard(item.index, item.section);
        addCardToDeck(item.card, section);
      } else {
        addCardToDeck(item.card, section);
      }
    },
    canDrop: (item: any) => {
      if (isDeckLocked) return false;
      if (item.section === section) return false;
      if (section === 'extra' && !isExtraDeckCard(item.card.type)) return false;
      if (section === 'main' && isExtraDeckCard(item.card.type)) return false;
      return true;
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
  }), [addCardToDeck, isExtraDeckCard, section, removeCard, isDeckLocked]);

  return <div ref={drop} className={cn("rounded-lg transition-colors", isOver && canDrop && "bg-primary/10", !isOver && canDrop && "bg-primary/5")}>{children}</div>;
};

const DeckBuilderInternal = ({ user, onLogout }: DeckBuilderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

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
  const [isDeckLocked, setIsDeckLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isJustLoaded, setIsJustLoaded] = useState(false);

  const [sortBy, setSortBy] = useState("popularity_desc");
  const [selectedCardTypes, setSelectedCardTypes] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [genesysPointsValue, setGenesysPointsValue] = useState<number | ''>('');
  const [genesysPointsOperator, setGenesysPointsOperator] = useState<'gte' | 'lte' | '='>('gte');
  const [selectedMonsterRaces, setSelectedMonsterRaces] = useState<string[]>([]);
  const [selectedSpellRaces, setSelectedSpellRaces] = useState<string[]>([]);
  const [selectedTrapRaces, setSelectedTrapRaces] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [deckNotes, setDeckNotes] = useState("");
  const [isDrawSimulatorOpen, setIsDrawSimulatorOpen] = useState(false);
  const [simulatedHand, setSimulatedHand] = useState<CardData[]>([]);
  const [remainingSimDeck, setRemainingSimDeck] = useState<CardData[]>([]);

  const fetchPopularCards = useCallback(async () => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_cards_with_filters_and_popularity', {
        p_search_query: null, p_selected_card_types: null, p_selected_attributes: null,
        p_selected_monster_races: null, p_selected_spell_races: null, p_selected_trap_races: null,
        p_genesys_points_operator: null, p_genesys_points_value: null,
        p_sort_by: 'popularity', p_sort_ascending: false
      });
      if (error) throw error;
      setSearchResults(data || []);
      setIsSearchActive(false);
    } catch (error) {
      console.error("Failed to fetch popular cards", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    fetchPopularCards();
  }, [fetchPopularCards]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCardTypeChange = (typeGroup: string) => {
    const typesInGroup = CARD_TYPE_GROUPS[typeGroup as keyof typeof CARD_TYPE_GROUPS];
    const areAllSelected = typesInGroup.every(t => selectedCardTypes.includes(t));
    if (areAllSelected) {
      setSelectedCardTypes(prev => prev.filter(t => !typesInGroup.includes(t)));
    } else {
      setSelectedCardTypes(prev => [...new Set([...prev, ...typesInGroup])]);
    }
  };

  const handleAttributeChange = (attribute: string) => setSelectedAttributes(prev => prev.includes(attribute) ? prev.filter(a => a !== attribute) : [...prev, attribute]);
  const handleMonsterRaceChange = (race: string) => setSelectedMonsterRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);
  const handleSpellRaceChange = (race: string) => setSelectedSpellRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);
  const handleTrapRaceChange = (race: string) => setSelectedTrapRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);

  const clearSearchAndShowPopular = () => {
    setSearchQuery("");
    setSelectedCardTypes([]);
    setSelectedAttributes([]);
    setSelectedMonsterRaces([]);
    setSelectedSpellRaces([]);
    setSelectedTrapRaces([]);
    setGenesysPointsValue('');
    setSortBy('popularity_desc');
    fetchPopularCards();
  };

  useEffect(() => {
    if (isLoadingDeck) return;
    const draft = { mainDeck, extraDeck, sideDeck, deckName, isPrivate, isGenesysMode, editingDeckId, timestamp: Date.now() };
    localStorage.setItem('deck_builder_draft', JSON.stringify(draft));
    if (isJustLoaded) setIsJustLoaded(false);
    else if (mainDeck.length > 0 || extraDeck.length > 0 || sideDeck.length > 0 || deckName) setHasUnsavedChanges(true);
  }, [mainDeck, extraDeck, sideDeck, deckName, isPrivate, isGenesysMode, editingDeckId, isLoadingDeck, isJustLoaded]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (hasUnsavedChanges) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const total = [...mainDeck, ...extraDeck, ...sideDeck].reduce((sum, card) => sum + (card.genesys_points || 0), 0);
    setTotalGenesysPoints(total);
  }, [mainDeck, extraDeck, sideDeck]);

  const isExtraDeckCard = (type: string) => type.includes("Fusion") || type.includes("Synchro") || type.includes("XYZ") || type.includes("Link");

  const discardChanges = useCallback(() => {
    localStorage.removeItem('deck_builder_draft');
    setHasUnsavedChanges(false);
    if (editingDeckId) window.location.reload();
    else {
      setMainDeck([]); setExtraDeck([]); setSideDeck([]);
      setDeckName(""); setEditingDeckId(null);
      toast({ title: "Rascunho Descartado" });
    }
  }, [editingDeckId, toast]);

  const loadDeckForEditing = useCallback(async (deckId: number) => {
    setIsLoadingDeck(true);
    try {
      const isSuperAdmin = user?.id === "80193776-6790-457c-906d-ed45ea16df9f";
      const { data: tournamentDecks, error: tournamentError } = await supabase.from('tournament_decks').select('tournaments(event_date)').eq('deck_id', deckId);
      if (tournamentError) throw new Error(tournamentError.message);

      const now = new Date();
      for (const entry of tournamentDecks) {
        if (entry.tournaments && new Date(entry.tournaments.event_date) <= now && !isSuperAdmin) {
          setIsDeckLocked(true);
          break;
        }
      }

      const { data: deckData, error: deckError } = await supabase.from('decks').select('*, profiles(*)').eq('id', deckId).single();
      if (deckError || !deckData) throw new Error("Deck não encontrado.");
      if (deckData.user_id !== user?.id && !isSuperAdmin) throw new Error("Acesso negado.");

      setDeckName(deckData.deck_name); setIsPrivate(deckData.is_private); setIsGenesysMode(deckData.is_genesys); setEditingDeckId(deckId);
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_cards_for_deck", { p_deck_id: deckId });
      if (rpcError) throw new Error(rpcError.message);
      if (rpcData) {
        const allRows = rpcData as any[];
        const mapRowToCard = (row: any): CardData => ({ id: row.card_api_id, name: row.name, pt_name: row.pt_name, type: row.type, description: row.description, race: row.race, attribute: row.attribute, atk: row.atk, def: row.def, level: row.level, image_url: row.image_url, image_url_small: row.image_url_small, ban_tcg: row.ban_tcg, ban_ocg: row.ban_ocg, ban_master_duel: row.ban_master_duel, genesys_points: row.genesys_points, md_rarity: row.md_rarity });
        setMainDeck(allRows.filter(row => row.deck_section?.toLowerCase() === 'main').map(mapRowToCard));
        setExtraDeck(allRows.filter(row => row.deck_section?.toLowerCase() === 'extra').map(mapRowToCard));
        setSideDeck(allRows.filter(row => row.deck_section?.toLowerCase() === 'side').map(mapRowToCard));
      }
      setIsJustLoaded(true); setHasUnsavedChanges(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
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

  const searchCards = async (shouldCloseModal: boolean = true) => {
    setIsSearchActive(true);
    setIsSearching(true);
    try {
      const [sortColumn, sortOrder] = sortBy.split('_');
      const { data, error } = await supabase.rpc('search_cards_with_filters_and_popularity', {
        p_search_query: searchQuery || null,
        p_selected_card_types: selectedCardTypes.length > 0 ? selectedCardTypes : null,
        p_selected_attributes: selectedAttributes.length > 0 ? selectedAttributes : null,
        p_selected_monster_races: selectedMonsterRaces.length > 0 ? selectedMonsterRaces : null,
        p_selected_spell_races: selectedSpellRaces.length > 0 ? selectedSpellRaces : null,
        p_selected_trap_races: selectedTrapRaces.length > 0 ? selectedTrapRaces : null,
        p_genesys_points_operator: genesysPointsValue !== '' ? genesysPointsOperator : null,
        p_genesys_points_value: genesysPointsValue !== '' ? genesysPointsValue : null,
        p_sort_by: sortColumn,
        p_sort_ascending: sortOrder === 'asc'
      });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
      if (shouldCloseModal) setIsFilterModalOpen(false);
    }
  };

  const addCardToDeck = (card: CardData, section: 'main' | 'extra' | 'side') => {
    let limit = 3;
    if (!isGenesysMode) {
      const status = card.ban_master_duel;
      if (status === "Forbidden" || status === "Banned") { toast({ title: "Banida", description: `${card.name} é proibida.`, variant: "destructive" }); return; }
      if (status === "Limited") limit = 1;
      if (status === "Semi-Limited") limit = 2;
    }
    const currentCopies = [...mainDeck, ...extraDeck, ...sideDeck].filter(c => c.id === card.id).length;
    if (currentCopies >= limit) { toast({ title: "Limite atingido", description: `Máximo de ${limit} cópias.`, variant: "destructive" }); return; }
    
    const targetSection = isExtraDeckCard(card.type) && section !== 'side' ? 'extra' : section;
    const setters = { main: setMainDeck, extra: setExtraDeck, side: setSideDeck };
    const decks = { main: mainDeck, extra: extraDeck, side: sideDeck };
    const limits = { main: 60, extra: 15, side: 15 };
    
    if (decks[targetSection].length >= limits[targetSection]) {
      toast({ title: "Deck cheio", description: `Limite de ${limits[targetSection]} cartas.`, variant: "destructive" });
      return;
    }
    
    setters[targetSection](prev => [...prev, card]);
  };
  
  const removeCard = (index: number, section: "main" | "extra" | "side") => {
    const setters = { main: setMainDeck, extra: setExtraDeck, side: setSideDeck };
    setters[section](prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  const clearDeck = () => {
    setMainDeck([]); setExtraDeck([]); setSideDeck([]); setDeckName(""); setEditingDeckId(null);
    toast({ title: "Deck limpo" });
  };

  const handleSortDeck = () => {
    setMainDeck(sortCards(mainDeck)); setExtraDeck(sortCards(extraDeck)); setSideDeck(sortCards(sideDeck));
    toast({ title: "Deck ordenado" });
  };

  const exportYdke = () => {
    const encodeToB64 = (cards: CardData[]) => {
      const ids = cards.map(c => parseInt(c.id, 10));
      const buffer = new ArrayBuffer(ids.length * 4);
      const view = new DataView(buffer);
      ids.forEach((id, i) => view.setUint32(i * 4, id, true));
      let binary = '';
      new Uint8Array(buffer).forEach((byte) => binary += String.fromCharCode(byte));
      return btoa(binary);
    };
    const ydkeString = `ydke://${encodeToB64(mainDeck)}!${encodeToB64(extraDeck)}!${encodeToB64(sideDeck)}`;
    navigator.clipboard.writeText(ydkeString).then(() => toast({ title: "Código YDKE copiado!" }));
  };

  const exportDeck = () => {
    const fileContent = '#main\n' + mainDeck.map(c => c.id).join('\n') + '\n#extra\n' + extraDeck.map(c => c.id).join('\n') + '\n!side\n' + sideDeck.map(c => c.id).join('\n') + '\n';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${deckName || 'deck'}.ydk`;
    link.href = url;
    link.click();
  };

  const handleImportYdkClick = () => fileInputRef.current?.click();
  const handleYdkeImport = async () => {
    try {
      let ydkeString = await navigator.clipboard.readText();
      if (!ydkeString.startsWith("ydke://")) throw new Error("Código inválido.");
      const [m, e, s] = ydkeString.substring(7).split('!');
      const decodeB64 = (b64: string) => {
        if(!b64) return [];
        const decoded = atob(b64);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
        const dataView = new DataView(bytes.buffer);
        const ids = [];
        for (let i = 0; i < bytes.length; i += 4) ids.push(dataView.getUint32(i, true));
        return ids;
      };
      const mainIds = decodeB64(m), extraIds = decodeB64(e), sideIds = decodeB64(s);
      const allIds = [...new Set([...mainIds, ...extraIds, ...sideIds])];
      const { data: cards } = await supabase.from('cards').select('*').in('id', allIds);
      if (!cards) return;
      const cardMap = new Map(cards.map((c: any) => [String(c.id), c]));
      setMainDeck(mainIds.map(id => cardMap.get(String(id))).filter(Boolean));
      setExtraDeck(extraIds.map(id => cardMap.get(String(id))).filter(Boolean));
      setSideDeck(sideIds.map(id => cardMap.get(String(id))).filter(Boolean));
      toast({ title: "Deck importado!" });
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const lines = content.split(/\r?\n/).map(l => l.trim());
      let current = '';
      const m: string[] = [], ex: string[] = [], s: string[] = [];
      for (const l of lines) {
        if (l.startsWith('#main')) current = 'm';
        else if (l.startsWith('#extra')) current = 'e';
        else if (l.startsWith('!side')) current = 's';
        else if (l && !l.startsWith('#') && !l.startsWith('!')) {
          if (current === 'm') m.push(l);
          if (current === 'e') ex.push(l);
          if (current === 's') s.push(l);
        }
      }
      const allIds = [...new Set([...m, ...ex, ...s])];
      const { data: cards } = await supabase.from('cards').select('*').in('id', allIds);
      if (!cards) return;
      const cardMap = new Map(cards.map((c: any) => [String(c.id), c]));
      setMainDeck(m.map(id => cardMap.get(id)).filter(Boolean));
      setExtraDeck(ex.map(id => cardMap.get(id)).filter(Boolean));
      setSideDeck(s.map(id => cardMap.get(id)).filter(Boolean));
      setDeckName(file.name.replace('.ydk', ''));
      toast({ title: "Deck carregado!" });
    };
    reader.readAsText(file);
  };

  const saveDeck = async () => {
    if (!user || !deckName.trim() || mainDeck.length < 40) {
      toast({ title: "Erro ao salvar", description: "Verifique o nome e o mínimo de 40 cartas.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const cards = [
        ...mainDeck.map(c => ({ card_api_id: String(c.id), deck_section: "main" })),
        ...extraDeck.map(c => ({ card_api_id: String(c.id), deck_section: "extra" })),
        ...sideDeck.map(c => ({ card_api_id: String(c.id), deck_section: "side" }))
      ];
      if (editingDeckId) {
        await supabase.from('decks').update({ deck_name: deckName, is_private: isPrivate, is_genesys: isGenesysMode }).eq('id', editingDeckId);
        await supabase.from('deck_cards').delete().eq('deck_id', editingDeckId);
        await supabase.from('deck_cards').insert(cards.map(c => ({ ...c, deck_id: editingDeckId })));
      } else {
        const { data: deck } = await supabase.from('decks').insert({ user_id: user.id, deck_name: deckName, is_private: isPrivate, is_genesys: isGenesysMode }).select().single();
        if (deck) await supabase.from('deck_cards').insert(cards.map(c => ({ ...c, deck_id: deck.id })));
      }
      toast({ title: "Deck salvo com sucesso!" });
      navigate(`/profile/${user.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const startSimulation = () => {
    if (mainDeck.length < 5) {
      toast({ title: "Mínimo 5 cartas", variant: "destructive" });
      return;
    }
    const shuffled = [...mainDeck].sort(() => Math.random() - 0.5);
    setSimulatedHand(shuffled.slice(0, 5));
    setRemainingSimDeck(shuffled.slice(5));
    setIsDrawSimulatorOpen(true);
  };

  const drawOne = () => {
    if (remainingSimDeck.length === 0) return;
    const [card, ...rest] = remainingSimDeck;
    setSimulatedHand(prev => [...prev, card]);
    setRemainingSimDeck(rest);
  };

  const resetSimulation = () => {
    const shuffled = [...mainDeck].sort(() => Math.random() - 0.5);
    setSimulatedHand(shuffled.slice(0, 5));
    setRemainingSimDeck(shuffled.slice(5));
  };

  if (isLoadingDeck) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-stone-200 selection:bg-primary/30 selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-[50] w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl transition-all">
        <div className="container-fluid px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                <Layout className="w-5 h-5 text-black" />
              </div>
              <span className="font-black uppercase italic tracking-tighter text-xl text-white">YuGi<span className="text-primary">Forge</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/tournaments" className="text-sm font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Torneios</Link>
              <Link to="/ranking" className="text-sm font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Ranking</Link>
              <Link to="/news" className="text-sm font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors">Blog</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Builder v2.0</span>
            </div>
            <Navbar user={user} onLogout={onLogout} hideLogo />
          </div>
        </div>
      </header>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".ydk" style={{ display: 'none' }} />
      
      <main className="container-fluid px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8 mb-8">
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Identificação do Deck</Label>
                <div className="relative group">
                  <PenTool className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                  <Input 
                    placeholder="Nome do Deck..." 
                    className="h-14 pl-12 bg-white/5 border-white/10 text-xl font-black italic uppercase tracking-tighter rounded-xl"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    disabled={isDeckLocked}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <Button variant="ghost" size="sm" onClick={clearDeck} disabled={isDeckLocked} className="h-10 px-4 rounded-lg hover:bg-red-500/10 hover:text-red-500 gap-2">
                    <Eraser className="w-4 h-4" />
                    <span className="hidden sm:inline font-bold uppercase text-[10px] tracking-widest">Limpar</span>
                  </Button>
                  <Separator orientation="vertical" className="h-6 bg-white/10" />
                  <Button variant="ghost" size="sm" onClick={handleSortDeck} disabled={isDeckLocked} className="h-10 px-4 rounded-lg hover:bg-primary/10 hover:text-primary gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    <span className="hidden sm:inline font-bold uppercase text-[10px] tracking-widest">Ordenar</span>
                  </Button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 gap-2 font-black uppercase text-[10px] tracking-widest">
                      <Download className="w-4 h-4" /> Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#121212] border-white/10 text-white">
                    <DropdownMenuItem onClick={exportDeck} className="gap-2 focus:bg-primary/20 cursor-pointer">
                      <FileDown className="w-4 h-4" /> .YDK
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportYdke} className="gap-2 focus:bg-primary/20 cursor-pointer">
                      <Share2 className="w-4 h-4" /> YDKE
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button 
                  onClick={saveDeck} 
                  disabled={isSaving || isDeckLocked} 
                  className="h-12 px-8 rounded-xl bg-primary text-black font-black uppercase italic tracking-tighter hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                  {isDeckLocked ? "Bloqueado" : (editingDeckId ? "Atualizar" : "Salvar")}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-8 py-4 px-6 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                <Switch checked={isPrivate} onCheckedChange={setIsPrivate} className="data-[state=checked]:bg-primary" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Privado</Label>
              </div>
              <Separator orientation="vertical" className="h-8 bg-white/10" />
              <div className="flex items-center gap-3">
                <Switch checked={isGenesysMode} onCheckedChange={setIsGenesysMode} className="data-[state=checked]:bg-primary" />
                <Label className="text-[10px] font-black uppercase tracking-widest">Genesys</Label>
              </div>
              {isGenesysMode && (
                <>
                  <Separator orientation="vertical" className="h-8 bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Pontos</span>
                    <span className="text-xl font-black italic text-white">{totalGenesysPoints}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20 p-6 flex flex-col justify-center items-center text-center gap-4">
             <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/20">
                <Wand2 className="w-6 h-6" />
             </div>
             <div>
                <h4 className="font-black uppercase italic tracking-tighter text-white">Simulador</h4>
                <p className="text-[10px] text-stone-500 font-medium uppercase tracking-widest mt-1">Teste sua consistência</p>
             </div>
             <Button onClick={startSimulation} variant="outline" className="w-full border-primary/30 text-primary h-10 font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-primary hover:text-black transition-all">
                Abrir Simulador
             </Button>
          </Card>
        </div>

        {isDeckLocked && (<div className="flex items-center gap-2 text-sm text-red-500 bg-red-900/30 p-3 rounded-md mb-6"><AlertTriangle className="h-4 w-4" />Deck travado por participação em torneio ativo.</div>)}

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8 order-2 lg:order-1">
            <DeckDropZone section="main" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Main Deck</h2>
                    <Badge variant="secondary" className={cn("h-6 px-3 bg-white/5 border-white/10 text-stone-400 font-black tracking-widest", mainDeck.length >= 40 && mainDeck.length <= 60 ? "text-primary border-primary/30 bg-primary/10" : "text-red-400")}>
                      {mainDeck.length} / 60
                    </Badge>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 hover:text-primary flex items-center transition-colors">
                        <Info className="w-3 h-3 mr-2" /> Como Enviar?
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-[#0a0a0a] border-white/10 text-white">
                      <DialogHeader><DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Como Exportar seu Deck</DialogTitle></DialogHeader>
                      <div className="prose prose-invert max-w-none prose-a:text-primary pt-4"><ReactMarkdown rehypePlugins={[rehypeRaw]}>{instructions}</ReactMarkdown></div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="min-h-[300px] p-6 bg-[#121212] rounded-[2rem] border border-white/5 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/bg-main.png')] opacity-[0.03] grayscale pointer-events-none" />
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-3 relative z-10">
                    {mainDeck.map((card, index) => (
                      <DraggableDeckCard key={`m-${index}`} card={card} index={index} section="main" removeCard={removeCard} isGenesysMode={isGenesysMode} isDeckLocked={isDeckLocked} />
                    ))}
                    {!isDeckLocked && mainDeck.length < 60 && (
                      <div className="aspect-[2/3] rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-stone-700 hover:border-primary/20 hover:text-primary/30 transition-all duration-500 group/add">
                        <Plus className="w-8 h-8 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Add</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DeckDropZone>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DeckDropZone section="extra" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">Extra Deck ({extraDeck.length}/15)</h2>
                  <div className="min-h-[150px] p-5 bg-[#121212] rounded-3xl border border-white/5 shadow-inner">
                    <div className="grid grid-cols-5 gap-3">
                      {extraDeck.map((card, index) => (
                        <DraggableDeckCard key={`e-${index}`} card={card} index={index} section="extra" removeCard={removeCard} isGenesysMode={isGenesysMode} isDeckLocked={isDeckLocked} />
                      ))}
                    </div>
                  </div>
                </div>
              </DeckDropZone>
              <DeckDropZone section="side" addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} removeCard={removeCard} isDeckLocked={isDeckLocked}>
                <div className="space-y-4 text-white">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter">Side Deck ({sideDeck.length}/15)</h2>
                  <div className="min-h-[150px] p-5 bg-[#121212] rounded-3xl border border-white/5 shadow-inner">
                    <div className="grid grid-cols-5 gap-3">
                      {sideDeck.map((card, index) => (
                        <DraggableDeckCard key={`s-${index}`} card={card} index={index} section="side" removeCard={removeCard} isGenesysMode={isGenesysMode} isDeckLocked={isDeckLocked} />
                      ))}
                    </div>
                  </div>
                </div>
              </DeckDropZone>
            </div>

            <Card className="bg-[#121212] border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
               <div className="flex items-center gap-3 px-8 pt-6">
                  <PenTool className="w-5 h-5 text-primary" />
                  <h3 className="font-black uppercase italic tracking-tighter text-lg text-white">Notas & Combos</h3>
               </div>
               <CardContent className="p-8">
                  <textarea 
                    placeholder="Escreva sua estratégia aqui (Markdown suportado)..."
                    className="w-full min-h-[200px] bg-white/5 border border-white/10 rounded-2xl p-6 text-stone-300 leading-relaxed focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none resize-none"
                    value={deckNotes}
                    onChange={(e) => setDeckNotes(e.target.value)}
                  />
               </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="bg-[#121212] border-white/5 rounded-[2rem] p-6 shadow-2xl sticky top-24">
              <div className="space-y-4 mb-8">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500 group-focus-within:text-primary transition-colors" />
                  <Input 
                    placeholder="Buscar cartas..." 
                    className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-base font-medium transition-all"
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && searchCards(false)} 
                  />
                  <Button 
                    onClick={() => searchCards(false)} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-primary hover:bg-primary/90 text-black rounded-xl p-0"
                  >
                    <Search className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex-1 h-12 rounded-xl border-white/10 bg-white/5 text-stone-400 font-bold uppercase text-[10px] tracking-widest gap-2"
                  >
                    <Filter className="w-4 h-4" /> Filtros
                  </Button>
                  <Button variant="outline" onClick={handleImportYdkClick} className="h-12 w-12 rounded-xl border-white/10 bg-white/5 p-0">
                    <FileUp className="w-5 h-5 text-stone-400" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500 px-1">
                  {isSearchActive ? "Resultados" : "Populares"}
                </h3>
                <ScrollArea className="h-[calc(100vh-450px)] pr-4">
                  {isSearchActive ? (
                    <div className="space-y-2">
                      {searchResults.map((card, index) => (
                        <DraggableSearchResultCard key={`r-${index}`} card={card} isGenesysMode={isGenesysMode} addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} isDeckLocked={isDeckLocked} />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {searchResults.map((card, index) => (
                        <PopularCardGridItem key={`p-${index}`} card={card} isGenesysMode={isGenesysMode} addCardToDeck={addCardToDeck} isExtraDeckCard={isExtraDeckCard} isDeckLocked={isDeckLocked} />
                      ))}
                    </div>
                  )}
                  {isSearching && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Acessando Banco...</span>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isDrawSimulatorOpen} onOpenChange={setIsDrawSimulatorOpen}>
        <DialogContent className="max-w-5xl bg-[#0a0a0a] border-primary/30 p-0 overflow-hidden shadow-2xl rounded-[2rem] text-white">
          <div className="p-12 space-y-12">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Simulador de Mão</h2>
                <p className="text-sm text-stone-500 font-medium uppercase tracking-widest mt-1">Probabilidade Inicial (Draw 5)</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={resetSimulation} variant="outline" className="border-white/10 bg-white/5 gap-2 font-black uppercase text-[10px] tracking-widest rounded-xl h-12 px-6">
                  <Shuffle className="w-4 h-4" /> Reiniciar
                </Button>
                <Button onClick={drawOne} disabled={remainingSimDeck.length === 0} className="bg-primary text-black font-black uppercase italic tracking-tighter gap-2 rounded-xl h-12 px-8">
                  <Wand2 className="w-4 h-4" /> Comprar 1
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 min-h-[300px]">
              {simulatedHand.map((card, i) => (
                <div key={i} className="w-40 group relative">
                  <img src={card.image_url} alt={card.name} className="w-full rounded-lg shadow-2xl border border-white/5 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 rounded-lg blur-xl transition-opacity -z-10" />
                </div>
              ))}
            </div>
            
            <div className="flex justify-center gap-8 border-t border-white/5 pt-8">
               <div className="text-center">
                  <p className="text-[10px] font-black text-stone-500 uppercase">Restantes no Deck</p>
                  <p className="text-2xl font-black italic text-primary">{remainingSimDeck.length}</p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-stone-500 uppercase">Cartas na Mão</p>
                  <p className="text-2xl font-black italic text-white">{simulatedHand.length}</p>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-3xl rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-primary">Filtros de Busca</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6 mt-6">
            <div className="space-y-8 pb-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Ordenar Por</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121212] text-white">
                    <SelectItem value="popularity_desc">Mais Populares</SelectItem>
                    <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                    <SelectItem value="atk_desc">ATK (Maior)</SelectItem>
                    <SelectItem value="def_desc">DEF (Maior)</SelectItem>
                    <SelectItem value="level_desc">Level (Maior)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Tipo de Carta</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(CARD_TYPE_GROUPS).map(group => (
                    <div key={group} className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg border border-white/5">
                      <Checkbox 
                        id={`type-${group}`} 
                        checked={CARD_TYPE_GROUPS[group as keyof typeof CARD_TYPE_GROUPS].every(t => selectedCardTypes.includes(t))}
                        onCheckedChange={() => handleCardTypeChange(group)}
                      />
                      <Label htmlFor={`type-${group}`} className="text-[10px] font-bold uppercase cursor-pointer truncate">{group}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Atributos</Label>
                <div className="flex flex-wrap gap-2">
                  {ATTRIBUTES.map(attr => (
                    <Badge 
                      key={attr}
                      variant="outline"
                      className={cn(
                        "h-10 px-4 rounded-xl border-white/10 bg-white/5 cursor-pointer text-[10px] font-black",
                        selectedAttributes.includes(attr) && "bg-primary text-black border-primary"
                      )}
                      onClick={() => handleAttributeChange(attr)}
                    >
                      {attr}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-4 mt-8">
            <Button variant="ghost" onClick={clearSearchAndShowPopular} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-stone-500">Resetar</Button>
            <Button onClick={() => searchCards(true)} className="flex-[2] h-14 rounded-2xl bg-primary text-black font-black uppercase italic tracking-tighter text-lg shadow-lg shadow-primary/20">Aplicar Filtros</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DeckBuilder = (props: DeckBuilderProps) => (
  <DndProvider backend={HTML5Backend}>
    <DeckBuilderInternal {...props} />
  </DndProvider>
);

export default DeckBuilder;
