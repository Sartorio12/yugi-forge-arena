import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { User as UserIcon, Shield, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import UserDisplay from "@/components/UserDisplay";

interface SearchResult {
  id: string;
  name: string;
  avatar_url: string;
  type: 'user' | 'clan';
  tag?: string;
}

export const GlobalSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ["globalSearch", debouncedSearchTerm],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedSearchTerm.trim()) {
        return [];
      }
      const { data, error } = await supabase.rpc("search_global", {
        search_term: debouncedSearchTerm,
      });
      if (error) {
        console.error("Search error:", error);
        throw new Error(error.message);
      }
      return data || [];
    },
    enabled: !!debouncedSearchTerm,
  });

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'user') {
      navigate(`/profile/${result.id}`);
    } else if (result.type === 'clan') {
      navigate(`/clans/${result.id}`);
    }
    setSearchTerm("");
    setIsOpen(false);
  };

  useEffect(() => {
    if (debouncedSearchTerm.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedSearchTerm, results]);

  return (
    <div className="relative flex-1">
      <Command className="relative overflow-visible">
        <CommandInput
          placeholder="Buscar usuários ou clãs..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {isOpen && (
          <CommandList className="absolute top-full mt-2 w-full bg-card border border-border rounded-md shadow-lg z-10">
            {isLoading && debouncedSearchTerm && (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && debouncedSearchTerm && !results?.length && (
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            )}
            {results && results.length > 0 && (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    value={result.name}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.avatar_url} alt={result.name} />
                      <AvatarFallback>
                        {result.type === 'user' ? <UserIcon className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <UserDisplay profile={{ ...result, username: result.name }} clan={result.tag ? { tag: result.tag } : null} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        )}
      </Command>
    </div>
  );
};
