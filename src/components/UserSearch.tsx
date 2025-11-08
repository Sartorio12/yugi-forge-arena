import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { User as UserIcon, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResult {
  id: string;
  username: string;
  avatar_url: string;
}

export const UserSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ["userSearch", debouncedSearchTerm],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!debouncedSearchTerm.trim()) {
        return [];
      }
      const { data, error } = await supabase.rpc("search_users", {
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

  const handleSelect = (userId: string) => {
    navigate(`/profile/${userId}`);
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
    <div className="relative flex-1 max-w-xs mx-4">
      <Command className="relative overflow-visible">
        <CommandInput
          placeholder="Buscar usuários..."
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
              <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            )}
            {results && results.length > 0 && (
              <CommandGroup>
                {results.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.username}
                    onSelect={() => handleSelect(user.id)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url} alt={user.username} />
                      <AvatarFallback>
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.username}</span>
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
