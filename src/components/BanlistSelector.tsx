import { useState, useCallback, useEffect } from "react";
import { Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CardData {
  id: string;
  name: string;
  pt_name?: string | null;
  image_url_small: string;
}

interface BanlistSelectorProps {
  maxSelection: number;
  selectedCards: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  unavailableCards?: string[]; // IDs of cards already banned by others
}

export const BanlistSelector = ({ maxSelection, selectedCards, onSelectionChange, unavailableCards = [] }: BanlistSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CardData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCardsData, setSelectedCardsData] = useState<CardData[]>([]);
  const { toast } = useToast();

  // Load details for already selected cards (if any)
  useEffect(() => {
    const loadSelectedDetails = async () => {
      if (selectedCards.length === 0) {
        setSelectedCardsData([]);
        return;
      }
      
      const { data } = await supabase
        .from("cards")
        .select("id, name, pt_name, image_url_small")
        .in("id", selectedCards);
        
      if (data) setSelectedCardsData(data);
    };
    loadSelectedDetails();
  }, [selectedCards]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .rpc("search_cards", { 
          search_query: searchTerm, 
          p_limit: 20
        });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching cards:", error);
      toast({
        title: "Erro na busca",
        description: "Não foi possível buscar as cartas.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchTerm, toast]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.length >= 2) handleSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, handleSearch]);

  const toggleCard = (card: CardData) => {
    if (selectedCards.includes(card.id)) {
      onSelectionChange(selectedCards.filter(id => id !== card.id));
      setSelectedCardsData(prev => prev.filter(c => c.id !== card.id));
    } else {
      if (selectedCards.length >= maxSelection) {
        toast({
          title: "Limite atingido",
          description: `Você só pode banir ${maxSelection} cartas.`,
          variant: "destructive",
        });
        return;
      }
      onSelectionChange([...selectedCards, card.id]);
      setSelectedCardsData(prev => [...prev, card]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          Selecionado: {selectedCards.length} / {maxSelection}
        </span>
      </div>

      {/* Selected Cards Strip */}
      {selectedCardsData.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 min-h-[80px]">
          {selectedCardsData.map(card => (
            <div key={card.id} className="relative group shrink-0">
              <img 
                src={card.image_url_small} 
                alt={card.name} 
                className="h-20 w-auto rounded border border-border" 
              />
              <button
                onClick={() => toggleCard(card)}
                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Digite o nome da carta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1 max-h-[400px] overflow-y-auto p-1 border rounded-md">
        {isSearching ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : searchResults.length > 0 ? (
          searchResults.map((card) => {
            const isSelected = selectedCards.includes(card.id);
            const isUnavailable = unavailableCards.includes(card.id);
            
            return (
              <Card 
                key={card.id} 
                className={`
                    transition-all overflow-hidden aspect-[2/3] relative rounded-none
                    ${isSelected ? 'ring-2 ring-destructive opacity-50' : ''}
                    ${isUnavailable ? 'opacity-40 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
                `}
                onClick={() => !isUnavailable && toggleCard(card)}
              >
                <img 
                  src={card.image_url_small} 
                  alt={card.name} 
                  className="w-full h-full object-cover rounded-none" 
                  loading="lazy"
                />
                {isUnavailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <span className="text-white font-bold text-xs bg-red-600 px-2 py-1 rounded">JÁ BANIDO</span>
                    </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
            {searchTerm.length < 2 ? "Digite para buscar..." : "Nenhuma carta encontrada."}
          </div>
        )}
      </div>
    </div>
  );
};
