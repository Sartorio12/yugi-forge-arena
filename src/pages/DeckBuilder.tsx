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

const DeckBuilderStyles = () => (
  <style>{`
    .db-container {
        width: 100%;
        max-width: 1600px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin: 0 auto;
        padding: 10px 20px;
        background-color: #212123;
        color: white;
        min-height: 100vh;
        box-sizing: border-box;
        overflow-x: hidden;
    }

    @media (max-width: 768px) {
        .db-container {
            padding: 5px;
            gap: 8px !important;
        }
        .db-header h1 {
            font-size: 18px !important;
            margin-bottom: 0 !important;
        }
        .db-header h2 {
            font-size: 10px !important;
            margin-bottom: 8px !important;
            letter-spacing: 1px !important;
        }
        .db-controls-top {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
            margin-bottom: 5px !important;
        }
        .db-input-group label {
            font-size: 10px !important;
            margin-bottom: 2px !important;
        }
        .db-custom-select {
            padding: 6px 10px !important;
            font-size: 12px !important;
        }
        .db-input-arrow {
            top: 26px !important;
        }
        .db-buttons-row {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            margin-bottom: 8px !important;
        }
        .db-btn {
            padding: 5px 8px !important;
            font-size: 11px !important;
        }
        .db-main-content {
            grid-template-columns: 1fr !important;
            gap: 15px !important;
            width: 100% !important;
            box-sizing: border-box;
        }
        .db-titles {
            gap: 12px !important;
        }
        .db-title-tab {
            font-size: 18px !important;
        }
        .db-section-header {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 8px !important;
            margin-bottom: 8px !important;
            padding-bottom: 5px !important;
        }
        .db-toggles-area {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px !important;
        }
        .db-panel-controls {
            flex-wrap: wrap !important;
            height: auto !important;
            gap: 6px !important;
            margin-bottom: 6px !important;
        }
        .db-search-input {
            min-width: 120px;
            padding: 0 8px !important;
            height: 30px !important;
        }
        .db-icon-btn, .db-tab-btn {
            height: 30px !important;
        }
        .db-card-grid-container {
            padding: 4px !important;
            min-height: 300px !important;
        }
        .db-grid-slots {
            grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
            gap: 3px !important;
        }
    }

    .db-header h1 {
        text-align: center;
        font-size: 24px;
        font-weight: 900;
        letter-spacing: 1px;
        text-transform: uppercase;
        line-height: 1;
        margin-bottom: 2px;
        color: white;
    }

    .db-header h2 {
        text-align: center;
        font-size: 14px;
        font-weight: 300;
        color: #ccc;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin-bottom: 15px;
    }

    .db-controls-top {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 5px;
    }

    @media (min-width: 1024px) {
        .db-controls-top {
            grid-template-columns: 1fr 1.2fr 1.2fr;
        }
    }

    .db-input-group {
        position: relative;
    }

    .db-input-group label {
        display: block;
        font-size: 12px;
        margin-bottom: 3px;
        color: #ddd;
    }

    .db-custom-select {
        width: 100%;
        background-color: #1a1a1a;
        border: 1px solid #333;
        padding: 10px 16px;
        color: #eee;
        font-size: 13px;
        appearance: none;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .db-custom-select:focus {
        border-color: #856f4b;
        outline: none;
    }

    .db-input-arrow {
        position: absolute;
        right: 16px;
        top: 36px;
        pointer-events: none;
        color: #856f4b;
        font-size: 10px;
    }

    .db-input-arrow-small {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
        color: #856f4b;
        font-size: 10px;
    }

    .db-buttons-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
    }

    .db-btn {
        background-color: #1a1a1a;
        border: 1px solid #333;
        color: #ddd;
        padding: 10px 16px;
        font-size: 11px;
        cursor: pointer;
        text-align: center;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        transition: all 0.2s;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: 0.5px;
    }

    .db-btn:hover:not(:disabled) {
        background-color: #252525;
        border-color: #856f4b;
        color: #856f4b;
        transform: translateY(-1px);
    }

    .db-btn:active:not(:disabled) {
        transform: translateY(0px);
    }

    .db-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .db-btn-arrow {
        margin-left: auto;
        padding-left: 8px;
    }

    .db-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #333;
        padding-bottom: 12px;
    }

    .db-titles {
        display: flex;
        gap: 30px;
        align-items: baseline;
    }

    .db-title-tab {
        font-size: 28px;
        font-weight: 900;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.3s;
        color: #444;
        font-style: italic;
        letter-spacing: -1px;
    }

    .db-title-tab.active {
        color: white;
        text-shadow: 0 0 20px rgba(133, 111, 75, 0.4);
    }

    .db-title-tab:hover:not(.active) {
        color: #888;
    }

    .db-sim-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .db-sim-stats {
        display: flex;
        gap: 20px;
    }

    .db-sim-stat-box {
        text-align: center;
        background: #1a1a1a;
        padding: 5px 15px;
        border-radius: 4px;
        border: 1px solid #333;
    }

    .db-sim-stat-label {
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
        font-weight: bold;
    }

    .db-sim-stat-value {
        font-size: 18px;
        font-weight: 900;
        color: #856f4b;
    }

    .db-toggles-area {
        display: flex;
        gap: 15px;
        align-items: center;
    }

    .db-toggle-group {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #ddd;
        text-transform: uppercase;
        font-weight: bold;
    }

    .db-switch {
        position: relative;
        display: inline-block;
        width: 34px;
        height: 18px;
    }

    .db-switch input {
        opacity: 0;
        width: 0;
        height: 0;
    }

    .db-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #444;
        transition: .4s;
        border-radius: 20px;
    }

    .db-slider:before {
        position: absolute;
        content: "";
        height: 14px;
        width: 14px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
    }

    .db-switch input:checked + .db-slider {
        background-color: #856f4b;
    }

    .db-switch input:checked + .db-slider:before {
        transform: translateX(16px);
    }

    .db-main-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
    }

    @media (min-width: 1024px) {
        .db-main-content {
            grid-template-columns: 280px 1fr 1fr;
        }
    }

    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #555;
    }

    .db-panel-controls {
        display: flex;
        gap: 8px;
        margin-bottom: 15px;
        height: 40px;
    }

    .db-search-input {
        background-color: #1a1a1a;
        border: 1px solid #333;
        color: #ddd;
        padding: 0 16px;
        flex-grow: 1;
        font-size: 14px;
        border-radius: 12px;
        transition: all 0.2s;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
    }

    .db-search-input:focus {
        border-color: #856f4b;
        outline: none;
        background-color: #222;
        box-shadow: 0 0 0 2px rgba(133, 111, 75, 0.2);
    }

    .db-icon-btn {
        background-color: #1a1a1a;
        border: 1px solid #333;
        color: white;
        width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 12px;
        transition: all 0.2s;
    }

    .db-icon-btn:hover {
        background-color: #333;
        border-color: #856f4b;
        color: #856f4b;
    }

    .db-tab-btn {
        background-color: #333;
        border: none;
        color: #aaa;
        padding: 0 18px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 12px;
        text-transform: uppercase;
        font-weight: 900;
        letter-spacing: 0.5px;
    }

    .db-tab-btn.active {
        background-color: #856f4b;
        color: black;
    }

    .db-card-grid-container {
        position: relative;
        background: rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        padding: 12px;
        min-height: 350px;
        border: 1px solid #333;
        border-radius: 16px;
    }

    .db-grid-slots {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
    }

    @media (min-width: 1400px) {
        .db-grid-slots {
            grid-template-columns: repeat(8, 1fr);
        }
    }

    @media (max-width: 1024px) {
        .db-grid-slots {
            grid-template-columns: repeat(5, 1fr);
        }
    }

    @media (max-width: 480px) {
        .db-grid-slots {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .db-slot {
        border: 1px solid rgba(255, 255, 255, 0.15);
        aspect-ratio: 2/3;
        transition: border-color 0.2s;
        position: relative;
    }

    .db-slot:hover {
        border-color: rgba(255, 255, 255, 0.4);
        background-color: rgba(255,255,255,0.05);
    }

    .db-slot:hover {
        border-color: rgba(255, 255, 255, 0.5);
        background-color: rgba(255,255,255,0.05);
    }

    .db-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
    }

    .db-results-area {
        max-height: 600px;
        overflow-y: auto;
    }

    .db-results-area::-webkit-scrollbar {
        width: 6px;
    }
    .db-results-area::-webkit-scrollbar-track {
        background: #1a1a1a;
    }
    .db-results-area::-webkit-scrollbar-thumb {
        background: #333;
    }
  `}</style>
);

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
  let imageUrl: string | undefined;
  if (rarity === "Normal") imageUrl = "/normal.png";
  else if (rarity === "Rare") imageUrl = "/rare.png";
  else if (rarity === "Super Rare") imageUrl = "/super_rare.png";
  else if (rarity === "Ultra Rare") imageUrl = "/ultra_rare.png";
  else return null;

  return <div style={{ position: "absolute", top: -10, right: 0, width: "35px", height: "35px", backgroundImage: `url('${imageUrl}')`, backgroundRepeat: "no-repeat", backgroundSize: "contain", zIndex: 10 }} />;
};

const BanlistIcon = ({ banStatus, isCustomBanned }: { banStatus: string | undefined | null, isCustomBanned?: boolean }) => {
  if (isCustomBanned) {
    return <div className="absolute top-1 left-1 w-5 h-5 z-20 pointer-events-none drop-shadow-md">
      <img src="/ban.png" alt="Banned" className="w-full h-full object-contain" />
    </div>;
  }
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

const PopularCardGridItem = ({ 
  card, 
  isGenesysMode, 
  addCardToDeck, 
  isExtraDeckCard, 
  isDeckLocked, 
  showHovers,
  currentSection,
  onInspect,
  isCustomBanned
}: { 
  card: CardData, 
  isGenesysMode: boolean, 
  addCardToDeck: (card: CardData, section: 'main' | 'extra' | 'side') => void, 
  isExtraDeckCard: (type: string) => boolean, 
  isDeckLocked: boolean, 
  showHovers: boolean,
  currentSection: string,
  onInspect?: (card: CardData) => void,
  isCustomBanned?: boolean
}) => {
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
    addCardToDeck(card, currentSection as any);
  }, [card, addCardToDeck, currentSection]);

  const handleLeftClick = () => {
    if (onInspect) {
      onInspect(card);
    } else {
      addCardToDeck(card, currentSection as any);
    }
  };

  const content = (
    <div 
      ref={drag} 
      className={cn(
        "relative w-full h-full rounded-md overflow-hidden cursor-grab active:cursor-grabbing group border border-white/5 hover:border-primary/50 transition-all",
        isDragging && "opacity-50"
      )}
      onContextMenu={handleRightClick}
      onClick={handleLeftClick}
      onDoubleClick={() => addCardToDeck(card, currentSection as any)}
    >
      <img src={card.image_url_small} alt={card.name} className="w-full h-full object-cover transition-transform duration-500" ref={preview} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} isCustomBanned={isCustomBanned} />}
      {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
      <RarityIcon rarity={card.md_rarity} />
    </div>
  );

  // Abolish hovers on desktop if inspector is available
  if (!showHovers || onInspect) return content;

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        {content}
      </HoverCardTrigger>
      <HoverCardContent side="left" className="w-[500px] p-0 bg-[#121212] border-primary/30 shadow-2xl z-[100]">
        <CardPreviewContent card={card} />
      </HoverCardContent>
    </HoverCard>
  );
};


const DraggableDeckCard = ({ 
  card, 
  index, 
  section, 
  removeCard, 
  isGenesysMode, 
  isDeckLocked, 
  showHovers,
  onInspect,
  isCustomBanned
}: { 
  card: CardData, 
  index: number, 
  section: "main" | "extra" | "side", 
  removeCard: (index: number, section: "main" | "extra" | "side") => void, 
  isGenesysMode: boolean, 
  isDeckLocked: boolean, 
  showHovers: boolean,
  onInspect?: (card: CardData) => void,
  isCustomBanned?: boolean
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({ type: ItemTypes.DECK_CARD, item: { card, index, section }, canDrag: !isDeckLocked, end: (item, monitor) => { if (!monitor.didDrop() && !isDeckLocked) { removeCard(item.index, item.section); } }, collect: (monitor) => ({ isDragging: !!monitor.isDragging() }) }), [card, index, section, removeCard, isDeckLocked]);
  
  const content = (
    <div 
      ref={drag} 
      className={cn(
        "relative w-full h-full rounded shadow-md cursor-grab active:cursor-grabbing group hover:ring-2 hover:ring-primary/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all",
        isDragging && "opacity-0"
      )}
      onClick={() => onInspect?.(card)}
    >
      <img src={card.image_url_small} alt={card.name} className="w-full h-full object-cover rounded" />
      {!isGenesysMode && <BanlistIcon banStatus={card.ban_master_duel} isCustomBanned={isCustomBanned} />}
      {isGenesysMode && <GenesysPointBadge points={card.genesys_points} />}
      <RarityIcon rarity={card.md_rarity} />
      
      {!isDeckLocked && (
        <Button 
          size="icon" 
          variant="destructive" 
          className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 z-30 shadow-lg scale-75 group-hover:scale-100 transition-all" 
          onClick={(e) => { e.stopPropagation(); removeCard(index, section); }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );

  if (!showHovers || onInspect) return content;

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        {content}
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
        // If dropping in the same section, do nothing (prevents removal)
        if (item.section === section) return;
        
        removeCard(item.index, item.section);
        addCardToDeck(item.card, section);
      } else {
        addCardToDeck(item.card, section);
      }
    },
    canDrop: (item: any) => {
      if (isDeckLocked) return false;
      // Allow dropping in same section to prevent monitor.didDrop() being false (which triggers removal)
      if (section === 'extra' && !isExtraDeckCard(item.card.type)) return false;
      if (section === 'main' && isExtraDeckCard(item.card.type)) return false;
      return true;
    },
    collect: (monitor) => ({ isOver: !!monitor.isOver(), canDrop: !!monitor.canDrop() }),
  }), [addCardToDeck, isExtraDeckCard, section, removeCard, isDeckLocked]);

  return <div ref={drop} className={cn("rounded-lg transition-colors", isOver && canDrop && "bg-primary/10", !isOver && canDrop && "bg-primary/5")}>{children}</div>;
};

const CardInspector = ({ card }: { card: CardData | null }) => {
  if (!card) {
    return (
      <div className="hidden lg:flex flex-col items-center justify-center h-full bg-[#1a1a1a] border border-[#333] rounded p-6 text-stone-500 italic text-center">
        <div className="w-full aspect-[2/3] border-2 border-dashed border-white/5 rounded-lg mb-6 flex items-center justify-center">
            <Info className="w-12 h-12 opacity-10" />
        </div>
        <p className="text-xs uppercase font-black tracking-widest opacity-40">Inspector</p>
        <p className="text-[10px] mt-2 leading-relaxed">Passe o mouse ou clique em uma carta para ver os detalhes completos aqui.</p>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex flex-col h-full bg-[#1a1a1a] border border-[#333] rounded overflow-hidden sticky top-4">
      <div className="p-3 bg-black/20">
         <img src={card.image_url} alt={card.name} className="w-full rounded shadow-2xl border border-white/5" />
      </div>
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar max-h-[450px]">
        <h3 className="text-lg font-black uppercase italic text-primary leading-tight mb-1 tracking-tighter">{card.name}</h3>
        {card.pt_name && <h4 className="text-[10px] text-muted-foreground font-bold mb-3 uppercase tracking-wider">{card.pt_name}</h4>}
        
        <div className="flex flex-wrap gap-1 mb-4">
          <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/20 text-primary py-0 h-5 font-black uppercase">
            {card.race}
          </Badge>
          <Badge variant="outline" className="text-[9px] bg-stone-800 border-stone-700 py-0 h-5 font-bold uppercase text-stone-400">
            {card.type}
          </Badge>
        </div>

        {(card.atk !== undefined || card.level !== undefined) && (
            <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-white/5 text-center">
            {card.level !== undefined && (
                <div>
                <p className="text-[8px] uppercase text-stone-500 font-black mb-1">Level</p>
                <p className="font-bold text-sm text-white">{card.level}</p>
                </div>
            )}
            {card.atk !== undefined && (
                <div>
                <p className="text-[8px] uppercase text-stone-500 font-black mb-1">ATK</p>
                <p className="font-bold text-sm text-red-400">{card.atk}</p>
                </div>
            )}
            {card.def !== undefined && (
                <div>
                <p className="text-[8px] uppercase text-stone-500 font-black mb-1">DEF</p>
                <p className="font-bold text-sm text-blue-400">{card.def}</p>
                </div>
            )}
            </div>
        )}

        <div className="relative">
            <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-primary/20" />
            <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap italic pl-3">
            {card.description}
            </p>
        </div>
      </div>
    </div>
  );
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
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [genesysPointsValue, setGenesysPointsValue] = useState<number | ''>('');
  const [genesysPointsOperator, setGenesysPointsOperator] = useState<'gte' | 'lte' | '='>('gte');
  const [selectedMonsterRaces, setSelectedMonsterRaces] = useState<string[]>([]);
  const [selectedSpellRaces, setSelectedSpellRaces] = useState<string[]>([]);
  const [selectedTrapRaces, setSelectedTrapRaces] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [userDecks, setUserDecks] = useState<{id: number, deck_name: string}[]>([]);
  const [inspectedCard, setInspectedCard] = useState<CardData | null>(null);
  
  // Custom Banlist states
  const [banlistTournaments, setBanlistTournaments] = useState<{id: number, title: string}[]>([]);
  const [selectedBanlistId, setSelectedBanlistId] = useState<string>("md");
  const [customBannedCardIds, setCustomBannedCardIds] = useState<Set<string>>(new Set());

  const fetchBanlistTournaments = useCallback(async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, title, type')
      .in('type', ['banimento', 'Banimento', 'BANIMENTO'])
      .is('deleted_at', null)
      .order('id', { ascending: false });
    
    if (error) {
      console.error("Error fetching banlist tournaments:", error);
      return;
    }
    
    if (data) setBanlistTournaments(data);
  }, []);

  useEffect(() => {
    fetchBanlistTournaments();
  }, [fetchBanlistTournaments]);

  useEffect(() => {
    const fetchCustomBans = async () => {
      if (selectedBanlistId === "md") {
        setCustomBannedCardIds(new Set());
        return;
      }
      const { data } = await supabase
        .from('tournament_banned_cards')
        .select('card_id')
        .eq('tournament_id', Number(selectedBanlistId));
      if (data) {
        setCustomBannedCardIds(new Set(data.map(b => b.card_id)));
      }
    };
    fetchCustomBans();
  }, [selectedBanlistId]);

  const [deckNotes, setDeckNotes] = useState("");
  const [isDrawSimulatorOpen, setIsDrawSimulatorOpen] = useState(false);
  const [simulatedHand, setSimulatedHand] = useState<CardData[]>([]);
  const [remainingSimDeck, setRemainingSimDeck] = useState<CardData[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'deck' | 'simulador'>('deck');

  const fetchUserDecks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('decks')
      .select('id, deck_name')
      .eq('user_id', user.id)
      .order('deck_name');
    if (data) setUserDecks(data);
  }, [user]);

  useEffect(() => {
    fetchUserDecks();
  }, [fetchUserDecks]);

  const [showHovers, setShowHovers] = useState(() => {
    const saved = localStorage.getItem("deck_builder_show_hovers");
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("deck_builder_show_hovers", JSON.stringify(showHovers));
  }, [showHovers]);

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
      setIsSearchActive(false); // Populares tab is active
    } catch (error) {
      console.error("Failed to fetch popular cards", error);
    } finally {
      setIsSearching(false);
    }
  }, []);


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
  const handleLevelChange = (level: number) => setSelectedLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]);
  const handleMonsterRaceChange = (race: string) => setSelectedMonsterRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);
  const handleSpellRaceChange = (race: string) => setSelectedSpellRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);
  const handleTrapRaceChange = (race: string) => setSelectedTrapRaces(prev => prev.includes(race) ? prev.filter(r => r !== race) : [...prev, race]);

  const resetSearch = () => {
    setSearchQuery("");
    setSelectedCardTypes([]);
    setSelectedAttributes([]);
    setSelectedLevels([]);
    setSelectedMonsterRaces([]);
    setSelectedSpellRaces([]);
    setSelectedTrapRaces([]);
    setGenesysPointsValue('');
    setSortBy('popularity_desc'); // Or a more neutral default if needed
    setSearchResults([]);
    setIsSearchActive(true); // Default to Results active after reset
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

  const isExtraDeckCard = (type: string) => 
    type.includes("Fusion") || 
    type.includes("Synchro") || 
    type.includes("XYZ") || 
    type.includes("Xyz") || 
    type.includes("Link") || 
    type.includes("Pendulum");

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
      const { data: tournamentDecks, error: tournamentError } = await supabase
        .from('tournament_decks')
        .select('tournaments(event_date, allow_deck_updates)')
        .eq('deck_id', deckId);
      
      if (tournamentError) throw new Error(tournamentError.message);

      const now = new Date();
      for (const entry of tournamentDecks) {
        if (entry.tournaments) {
          const t = entry.tournaments as any;
          const eventDate = new Date(t.event_date);
          const allowUpdates = t.allow_deck_updates || false;

          // Lock ONLY if the date has passed AND the tournament doesn't explicitly allow updates
          if (eventDate <= now && !allowUpdates && !isSuperAdmin) {
            setIsDeckLocked(true);
            break;
          }
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

  const initializationDone = useRef(false);

  useEffect(() => {
    const deckIdParam = searchParams.get('edit');
    const deckId = deckIdParam ? Number(deckIdParam) : null;

    const performInitialization = async () => {
      if (deckId && user) {
        // Only load if it's a different deck than currently editing
        if (deckId !== editingDeckId) {
          await loadDeckForEditing(deckId);
        }
      } else if (!deckId && !editingDeckId && !initializationDone.current) {
        // Check for draft in localStorage only once on initial mount if not editing a specific deck
        const savedDraft = localStorage.getItem('deck_builder_draft');
        const importData = localStorage.getItem('importDeckData');
        
        if (importData) {
          try {
            const parsedData = JSON.parse(importData);
            setDeckName(parsedData.deckName || "");
            setMainDeck(parsedData.mainDeck || []);
            setExtraDeck(parsedData.extraDeck || []);
            setSideDeck(parsedData.sideDeck || []);
            setIsPrivate(parsedData.isPrivate ?? true);
            setIsGenesysMode(parsedData.isGenesysMode || false);
            
            localStorage.removeItem('importDeckData');
            setIsJustLoaded(true);
            setHasUnsavedChanges(true);
            toast({
              title: "Deck Importado",
              description: "O deck foi carregado com sucesso!",
            });
          } catch (error) {
            console.error("Failed to parse importDeckData", error);
          }
        } else if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
            
            if (isRecent && (draft.mainDeck.length > 0 || draft.extraDeck.length > 0 || draft.sideDeck.length > 0 || draft.deckName)) {
              setDeckName(draft.deckName || "");
              setMainDeck(draft.mainDeck || []);
              setExtraDeck(draft.extraDeck || []);
              setSideDeck(draft.sideDeck || []);
              setIsPrivate(draft.isPrivate ?? false);
              setIsGenesysMode(draft.isGenesysMode || false);
              if (draft.editingDeckId) setEditingDeckId(draft.editingDeckId);
              
              setIsJustLoaded(true);
              setHasUnsavedChanges(true);
              toast({
                title: "Rascunho Recuperado",
                description: "Seu progresso anterior foi carregado automaticamente.",
              });
            }
          } catch (error) {
            console.error("Failed to parse draft", error);
          }
        }
      }
      setIsLoadingDeck(false);
      initializationDone.current = true;
    };

    performInitialization();
  }, [searchParams.get('edit'), user, loadDeckForEditing, toast, editingDeckId]);

  const searchCards = async () => {
    setIsSearchActive(true); // Always activate 'Resultados' tab

    const isAnyFilterActive = searchQuery ||
                             selectedCardTypes.length > 0 ||
                             selectedAttributes.length > 0 ||
                             selectedLevels.length > 0 ||
                             selectedMonsterRaces.length > 0 ||
                             selectedSpellRaces.length > 0 ||
                             selectedTrapRaces.length > 0 ||
                             genesysPointsValue !== '';

    if (!isAnyFilterActive) {
      setSearchResults([]); // No search term or filters, so show empty results
      setIsSearching(false); // Ensure loader is off
      return;
    }
    
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
        p_sort_ascending: sortOrder === 'asc',
        p_selected_levels: selectedLevels.length > 0 ? selectedLevels : null
      });
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const addCardToDeck = (card: CardData, section: 'main' | 'extra' | 'side') => {
    let limit = 3;
    if (!isGenesysMode) {
      // Custom Banlist Check
      if (selectedBanlistId !== "md" && customBannedCardIds.has(card.id)) {
        toast({ 
          title: "Carta Banida", 
          description: `${card.name} está proibida na Banlist deste torneio.`, 
          variant: "destructive" 
        });
        return;
      }

      const status = card.ban_master_duel;
      if (status === "Forbidden" || status === "Banned") { toast({ title: "Banida", description: `${card.name} é proibida.`, variant: "destructive" }); return; }
      if (status === "Limited") limit = 1;
      if (status === "Semi-Limited") limit = 2;
    }
    const currentCopies = [...mainDeck, ...extraDeck, ...sideDeck].filter(c => c.id === card.id).length;
    if (currentCopies >= limit) { toast({ title: "Limite atingido", description: `Máximo de ${limit} cópias.`, variant: "destructive" }); return; }
    
    let targetSection = section;
    if (section !== 'side') {
      targetSection = isExtraDeckCard(card.type) ? 'extra' : 'main';
    }

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
    localStorage.removeItem('deck_builder_draft');
    setHasUnsavedChanges(false);
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
      
      let isNewDeck = !editingDeckId;

      if (editingDeckId) {
        await supabase.from('decks').update({ deck_name: deckName, is_private: isPrivate, is_genesys: isGenesysMode }).eq('id', editingDeckId);
        await supabase.from('deck_cards').delete().eq('deck_id', editingDeckId);
        await supabase.from('deck_cards').insert(cards.map(c => ({ ...c, deck_id: editingDeckId })));
      } else {
        const { data: deck } = await supabase.from('decks').insert({ user_id: user.id, deck_name: deckName, is_private: isPrivate, is_genesys: isGenesysMode }).select().single();
        if (deck) {
          await supabase.from('deck_cards').insert(cards.map(c => ({ ...c, deck_id: deck.id })));
          setEditingDeckId(deck.id); // Convert to edit mode after first save
        }
      }
      
      localStorage.removeItem('deck_builder_draft');
      setHasUnsavedChanges(false);
      toast({ title: isNewDeck ? "Deck salvo com sucesso!" : "Deck atualizado com sucesso!" });
      
      if (isNewDeck) {
        navigate(`/profile/${user.id}`);
      }
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

  const deleteDeck = async () => {
    if (!editingDeckId) {
      clearDeck();
      return;
    }
    if (!confirm("Tem certeza que deseja deletar este deck?")) return;
    try {
      const { error } = await supabase.from('decks').delete().eq('id', editingDeckId);
      if (error) throw error;
      toast({ title: "Deck deletado com sucesso!" });
      navigate(`/profile/${user?.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao deletar", description: err.message, variant: "destructive" });
    }
  };

  const handleDeckSelect = (id: string) => {
    if (id === "new") {
      localStorage.removeItem('deck_builder_draft');
      setHasUnsavedChanges(false);
      navigate("/deck-builder");
      setEditingDeckId(null);
      setMainDeck([]);
      setExtraDeck([]);
      setSideDeck([]);
      setDeckName("");
    } else {
      navigate(`/deck-builder?edit=${id}`);
    }
  };

  if (isLoadingDeck) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentDeckSection = searchParams.get('section') || 'main';

  return (
    <div className="min-h-screen bg-[#212123]">
      <Navbar user={user} onLogout={onLogout} />
      <DeckBuilderStyles />

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".ydk" style={{ display: 'none' }} />

      <div className="db-container">
          {/* Header */}
          <header className="db-header">
              <h1>DECKBUILDER</h1>
              <h2>STAFF</h2>
          </header>

          {/* Top Controls */}
          <div className="db-controls-top">
              <div className="db-input-group">
                  <label>Banlist Vigente</label>
                  <select 
                    className="db-custom-select" 
                    value={selectedBanlistId} 
                    onChange={(e) => setSelectedBanlistId(e.target.value)}
                  >
                      <option value="md">Master Duel (Padrão)</option>
                      {banlistTournaments.map(tournament => (
                        <option key={tournament.id} value={tournament.id}>{tournament.title}</option>
                      ))}
                  </select>
                  <div className="db-input-arrow">↓</div>
              </div>
              <div className="db-input-group">
                  <label>Decks Salvos</label>
                  <select 
                    className="db-custom-select" 
                    value={editingDeckId || "new"} 
                    onChange={(e) => handleDeckSelect(e.target.value)}
                  >
                      <option value="new">Novo Deck</option>
                      {userDecks.map(deck => (
                        <option key={deck.id} value={deck.id}>{deck.deck_name}</option>
                      ))}
                  </select>
                  <div className="db-input-arrow">↓</div>
              </div>
              <div className="db-input-group">
                  <label>Nome</label>
                  <input 
                    type="text" 
                    className="db-custom-select" 
                    placeholder="Nome do Deck"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    disabled={isDeckLocked}
                  />
                  <div className="db-input-arrow">↓</div>
              </div>
          </div>

          {/* Action Buttons */}
          <div className="db-buttons-row">
              <button className="db-btn" onClick={saveDeck} disabled={isSaving || isDeckLocked}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isDeckLocked ? "Bloqueado" : (editingDeckId ? "Atualizar" : "Salvar")}
              </button>
              
              <div className="db-input-group">
                  <select 
                    className="db-custom-select" 
                    onChange={(e) => {
                      if (e.target.value === "ydk") exportDeck();
                      if (e.target.value === "ydke") exportYdke();
                      e.target.value = ""; // Reset
                    }}
                  >
                      <option value="" disabled selected>Exportar</option>
                      <option value="ydk">Arquivo .YDK</option>
                      <option value="ydke">Código YDKE</option>
                  </select>
                  <div className="db-input-arrow-small">↓</div>
              </div>

              <div className="db-input-group">
                  <select 
                    className="db-custom-select" 
                    onChange={(e) => {
                      if (e.target.value === "file") handleImportYdkClick();
                      if (e.target.value === "ydke") handleYdkeImport();
                      e.target.value = ""; // Reset
                    }}
                  >
                      <option value="" disabled selected>Importar</option>
                      <option value="file">Arquivo .YDK</option>
                      <option value="ydke">Código YDKE</option>
                  </select>
                  <div className="db-input-arrow-small">↓</div>
              </div>

              <button className="db-btn" onClick={deleteDeck} disabled={isDeckLocked}>
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </button>
          </div>

          {/* Sub Header */}
          <div className="db-section-header">
              <div className="db-titles">
                  <span 
                    className={cn("db-title-tab", activeWorkspaceTab === 'deck' && "active")}
                    onClick={() => setActiveWorkspaceTab('deck')}
                  >
                    DECK
                  </span>
                  <span 
                    className={cn("db-title-tab", activeWorkspaceTab === 'simulador' && "active")}
                    onClick={() => {
                        if (mainDeck.length < 5) {
                            toast({ title: "Mínimo 5 cartas no Main Deck", variant: "destructive" });
                            return;
                        }
                        setActiveWorkspaceTab('simulador');
                        if (simulatedHand.length === 0) startSimulation();
                    }}
                  >
                    SIMULADOR
                  </span>
              </div>
              <div className="db-toggles-area">
                  <div className="db-toggle-group">
                      <label className="db-switch">
                          <input 
                            type="checkbox" 
                            checked={isPrivate} 
                            onChange={(e) => setIsPrivate(e.target.checked)} 
                          />
                          <span className="db-slider"></span>
                      </label>
                      <span>Privado</span>
                  </div>
                  {isMobile && (
                    <div className="db-toggle-group">
                        <label className="db-switch">
                            <input 
                              type="checkbox" 
                              checked={showHovers} 
                              onChange={(e) => setShowHovers(e.target.checked)} 
                            />
                            <span className="db-slider"></span>
                        </label>
                        <span>Hovers</span>
                    </div>
                  )}
                  <div className="db-toggle-group">
                      <label className="db-switch">
                          <input 
                            type="checkbox" 
                            checked={isGenesysMode} 
                            onChange={(e) => setIsGenesysMode(e.target.checked)} 
                          />
                          <span className="db-slider"></span>
                      </label>
                      <span>Genesys</span>
                  </div>
              </div>
          </div>

          {/* Main Workspace */}
          {activeWorkspaceTab === 'deck' ? (
            <div className="db-main-content">
                {/* Inspector Panel (Desktop Only) */}
                {!isMobile && <CardInspector card={inspectedCard} />}

                {/* Left Panel (Filter + Grid) - SEARCH/DATABASE */}
                <div className="db-left-panel">
                    <div className="db-panel-controls">
                        <input 
                          type="text" 
                          className="db-search-input" 
                          placeholder="Busca..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && searchCards()}
                        />
                        <button className="db-icon-btn" onClick={() => setIsFilterModalOpen(true)}>
                            <svg className="db-icon" viewBox="0 0 24 24">
                                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
                            </svg>
                        </button>
                        <button 
                          className={cn("db-tab-btn", !isSearchActive && "active")}
                          onClick={fetchPopularCards}
                        >
                          Populares
                        </button>
                        <button 
                          className={cn("db-tab-btn", isSearchActive && "active")}
                          onClick={() => searchCards()}
                        >
                          Resultados
                        </button>
                    </div>
                    
                    <div className="db-card-grid-container db-results-area">
                        {isSearching ? (
                          <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-stone-600">Buscando...</span>
                          </div>
                        ) : (
                          <div className="db-grid-slots">
                              {searchResults.map((card, index) => (
                                <div key={`${isSearchActive ? 'r' : 'p'}-${index}`} className="db-slot">
                                  <PopularCardGridItem 
                                    card={card} 
                                    isGenesysMode={isGenesysMode} 
                                    addCardToDeck={addCardToDeck} 
                                    isExtraDeckCard={isExtraDeckCard} 
                                    isDeckLocked={isDeckLocked} 
                                    showHovers={showHovers} 
                                    currentSection={currentDeckSection}
                                    onInspect={!isMobile ? setInspectedCard : undefined}
                                    isCustomBanned={selectedBanlistId !== "md" && customBannedCardIds.has(card.id)}
                                  />
                                </div>
                              ))}
                          </div>
                        )}
                    </div>
                </div>

                {/* Right Panel (Grid Only) - CURRENT DECK */}
                <div className="db-right-panel">
                    <div className="db-panel-controls">
                        <button 
                          className={cn("db-tab-btn", currentDeckSection === 'main' && "active")}
                          onClick={() => navigate(`?${searchParams.toString().split('&').filter(p => !p.startsWith('section')).join('&')}&section=main`, { replace: true })}
                        >
                          Main ({mainDeck.length})
                        </button>
                        <button 
                          className={cn("db-tab-btn", currentDeckSection === 'extra' && "active")}
                          onClick={() => navigate(`?${searchParams.toString().split('&').filter(p => !p.startsWith('section')).join('&')}&section=extra`, { replace: true })}
                        >
                          Extra ({extraDeck.length})
                        </button>
                        <button 
                          className={cn("db-tab-btn", currentDeckSection === 'side' && "active")}
                          onClick={() => navigate(`?${searchParams.toString().split('&').filter(p => !p.startsWith('section')).join('&')}&section=side`, { replace: true })}
                        >
                          Side ({sideDeck.length})
                        </button>
                        
                        <div className="ml-auto flex gap-2">
                          <button onClick={handleSortDeck} className="db-icon-btn" title="Ordenar">
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                          <button onClick={clearDeck} className="db-icon-btn" title="Limpar">
                            <Eraser className="w-4 h-4" />
                          </button>
                        </div>
                    </div>

                    <DeckDropZone 
                      section={currentDeckSection as any} 
                      addCardToDeck={addCardToDeck} 
                      isExtraDeckCard={isExtraDeckCard} 
                      removeCard={removeCard} 
                      isDeckLocked={isDeckLocked}
                    >
                      <div className="db-card-grid-container">
                          <div className="db-grid-slots">
                              {(currentDeckSection === 'main' ? mainDeck : currentDeckSection === 'extra' ? extraDeck : sideDeck).map((card, index) => (
                                <div key={`${currentDeckSection}-${index}`} className="db-slot">
                                  <DraggableDeckCard 
                                    card={card} 
                                    index={index} 
                                    section={currentDeckSection as any} 
                                    removeCard={removeCard} 
                                    isGenesysMode={isGenesysMode} 
                                    isDeckLocked={isDeckLocked} 
                                    showHovers={showHovers} 
                                    onInspect={!isMobile ? setInspectedCard : undefined}
                                    isCustomBanned={selectedBanlistId !== "md" && customBannedCardIds.has(card.id)}
                                  />
                                </div>
                              ))}
                              {Array.from({ length: Math.max(0, 15 - (currentDeckSection === 'main' ? mainDeck : currentDeckSection === 'extra' ? extraDeck : sideDeck).length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="db-slot"></div>
                              ))}
                          </div>
                      </div>
                    </DeckDropZone>
                    
                    {isGenesysMode && (
                      <div className="mt-4 text-right">
                        <span className="text-primary font-black uppercase tracking-widest text-xs mr-2">Total Genesys:</span>
                        <span className="text-2xl font-black italic">{totalGenesysPoints}</span>
                      </div>
                    )}
                </div>
            </div>
          ) : (
            <div className="db-main-content">
                {/* Inspector Panel (Desktop Only) */}
                {!isMobile && <CardInspector card={inspectedCard} />}

                {/* Simulator UI following deckbuilder design */}
                <div className="db-left-panel">
                    <div className="db-sim-header">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">Mão Inicial</h3>
                        <div className="db-sim-stats">
                            <div className="db-sim-stat-box">
                                <p className="db-sim-stat-label">No Deck</p>
                                <p className="db-sim-stat-value">{remainingSimDeck.length}</p>
                            </div>
                            <div className="db-sim-stat-box">
                                <p className="db-sim-stat-label">Na Mão</p>
                                <p className="db-sim-stat-value">{simulatedHand.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="db-card-grid-container">
                        <div className="db-grid-slots">
                            {simulatedHand.map((card, i) => (
                              <div 
                                key={`sim-${i}`} 
                                className="db-slot cursor-help"
                                onClick={() => !isMobile && setInspectedCard(card)}
                              >
                                <div className="relative w-full h-full rounded overflow-hidden">
                                    <img src={card.image_url_small} alt={card.name} className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, 15 - simulatedHand.length) }).map((_, i) => (
                              <div key={`sim-empty-${i}`} className="db-slot"></div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="db-right-panel">
                    <div className="flex flex-col gap-4 justify-center h-full">
                        <button 
                          onClick={resetSimulation} 
                          className="db-btn py-4 text-lg font-black uppercase italic tracking-tighter"
                        >
                          <Shuffle className="w-5 h-5 mr-2" /> Reiniciar Simulação
                        </button>
                        <button 
                          onClick={drawOne} 
                          disabled={remainingSimDeck.length === 0} 
                          className="db-btn py-4 text-lg font-black uppercase italic tracking-tighter bg-primary/20 border-primary/40 text-primary"
                        >
                          <Wand2 className="w-5 h-5 mr-2" /> Comprar 1 Carta
                        </button>
                        <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2">Dica</h4>
                            <p className="text-xs text-stone-400 leading-relaxed italic">
                                O simulador utiliza apenas o Main Deck atual para gerar mãos aleatórias de 5 cartas. 
                                Use para testar a consistência de seus combos iniciais.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Notes Area */}
          <div className="mt-8">
            <h3 className="text-xs font-black uppercase italic tracking-widest text-primary mb-2">Notas & Combos</h3>
            <textarea 
                placeholder="Escreva sua estratégia aqui..."
                className="w-full min-h-[100px] bg-[#1a1a1a] border border-[#333] rounded p-4 text-stone-300 leading-relaxed focus:border-primary/50 outline-none resize-none"
                value={deckNotes}
                onChange={(e) => setDeckNotes(e.target.value)}
            />
          </div>
      </div>

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

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Nível / Rank</Label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(level => (
                    <Badge 
                      key={level}
                      variant="outline"
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl border-white/10 bg-white/5 cursor-pointer text-[12px] font-black",
                        selectedLevels.includes(level) && "bg-primary text-black border-primary"
                      )}
                      onClick={() => handleLevelChange(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Raça de Monstro</Label>
                <div className="flex flex-wrap gap-2">
                  {MONSTER_RACES.map(race => (
                    <Badge 
                      key={race}
                      variant="outline"
                      className={cn(
                        "h-8 px-3 rounded-lg border-white/10 bg-white/5 cursor-pointer text-[9px] font-bold uppercase",
                        selectedMonsterRaces.includes(race) && "bg-orange-500 text-white border-orange-500"
                      )}
                      onClick={() => handleMonsterRaceChange(race)}
                    >
                      {race}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Tipo de Magia</Label>
                  <div className="flex flex-wrap gap-2">
                    {SPELL_RACES.map(race => (
                      <Badge 
                        key={race}
                        variant="outline"
                        className={cn(
                          "h-8 px-3 rounded-lg border-white/10 bg-white/5 cursor-pointer text-[9px] font-bold uppercase",
                          selectedSpellRaces.includes(race) && "bg-green-600 text-white border-green-600"
                        )}
                        onClick={() => handleSpellRaceChange(race)}
                      >
                        {race}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Tipo de Armadilha</Label>
                  <div className="flex flex-wrap gap-2">
                    {TRAP_RACES.map(race => (
                      <Badge 
                        key={race}
                        variant="outline"
                        className={cn(
                          "h-8 px-3 rounded-lg border-white/10 bg-white/5 cursor-pointer text-[9px] font-bold uppercase",
                          selectedTrapRaces.includes(race) && "bg-pink-600 text-white border-pink-600"
                        )}
                        onClick={() => handleTrapRaceChange(race)}
                      >
                        {race}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Pontos Genesys</Label>
                <div className="flex gap-4 items-center">
                  <Select value={genesysPointsOperator} onValueChange={(val: any) => setGenesysPointsOperator(val)}>
                    <SelectTrigger className="w-32 h-12 bg-white/5 border-white/10 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121212] text-white">
                      <SelectItem value="gte">Maior ou Igual (&gt;=)</SelectItem>
                      <SelectItem value="lte">Menor ou Igual (&lt;=)</SelectItem>
                      <SelectItem value="=">Igual (=)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="Valor" 
                    className="h-12 bg-white/5 border-white/10 rounded-xl flex-1"
                    value={genesysPointsValue}
                    onChange={(e) => setGenesysPointsValue(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex gap-4 mt-8">
            <Button variant="ghost" onClick={resetSearch} className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-stone-500">Resetar</Button>
            <Button onClick={() => { searchCards(); setIsFilterModalOpen(false); }} className="flex-[2] h-14 rounded-2xl bg-primary text-black font-black uppercase italic tracking-tighter text-lg shadow-lg shadow-primary/20">Aplicar Filtros</Button>
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
