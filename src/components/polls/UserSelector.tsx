import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FramedAvatar } from "@/components/FramedAvatar";
import UserDisplay from "@/components/UserDisplay";

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
  tag?: string;
  equipped_frame_url?: string | null;
}

interface UserSelectorProps {
  onSelect: (user: SearchResult) => void;
  excludeIds?: string[];
  placeholder?: string;
}

export const UserSelector = ({ onSelect, excludeIds = [], placeholder = "Buscar jogador..." }: UserSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isOpen, setIsOpen] = useState(false);

  const { data: results, isLoading } = useQuery({
    queryKey: ["userSearch", debouncedSearchTerm],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedSearchTerm.trim()) {
        return [];
      }
      
      // Using search_global rpc but filtering for users manually or via rpc if possible
      // Assuming search_global returns type 'user'
      const { data, error } = await supabase.rpc("search_global", {
        search_term: debouncedSearchTerm,
      });

      if (error) {
        console.error("Search error:", error);
        return [];
      }

      // Filter for users only and map to SearchResult structure
      return (data || [])
        .filter((item: any) => item.type === 'user')
        .map((item: any) => ({
          id: item.id,
          username: item.name,
          avatar_url: item.avatar_url,
          tag: item.tag,
          // Frame url might not be in search_global, defaulting to null
          equipped_frame_url: null 
        }));
    },
    enabled: !!debouncedSearchTerm,
  });

  const handleSelect = (result: SearchResult) => {
    onSelect(result);
    setSearchTerm("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <Command className="relative overflow-visible border rounded-md">
        <CommandInput
          placeholder={placeholder}
          value={searchTerm}
          onValueChange={setSearchTerm}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
        {isOpen && searchTerm.trim().length > 0 && (
          <CommandList className="absolute top-full mt-2 w-full bg-card border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && results && results.filter(u => !excludeIds.includes(u.id)).length === 0 && (
              <CommandEmpty>Nenhum jogador encontrado.</CommandEmpty>
            )}
            {results && (
              <CommandGroup>
                {results
                  .filter(u => !excludeIds.includes(u.id))
                  .map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.username}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 cursor-pointer p-2 hover:bg-accent"
                    >
                      <FramedAvatar
                        userId={result.id}
                        avatarUrl={result.avatar_url}
                        username={result.username}
                        sizeClassName="h-8 w-8"
                      />
                      <UserDisplay profile={result} clan={result.tag ? { tag: result.tag } : null} />
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
