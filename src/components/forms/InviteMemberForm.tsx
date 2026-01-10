import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "use-debounce";
import { Loader2, Search, UserPlus, Check } from "lucide-react";
import { FramedAvatar } from "../FramedAvatar";
import { useToast } from "@/hooks/use-toast";

interface InviteMemberFormProps {
  clanId: number;
  existingMemberIds: string[];
}

export const InviteMemberForm = ({ clanId, existingMemberIds }: InviteMemberFormProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const { toast } = useToast();

  // Search users
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["searchUsersToInvite", debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const { data, error } = await supabase.rpc("search_global", {
        search_term: debouncedSearchTerm,
      });
      if (error) throw error;
      return data.filter((item: any) => item.type === "user");
    },
    enabled: !!debouncedSearchTerm,
  });

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("invite_user_to_clan", {
        p_clan_id: clanId,
        p_invitee_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Convite enviado!", description: "O usuário foi notificado." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Erro ao convidar", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleInvite = (userId: string) => {
    inviteMutation.mutate(userId);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar usuário para convidar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2">
        {isSearching && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        {!isSearching && searchResults && searchResults.length === 0 && debouncedSearchTerm && (
          <p className="text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        )}

        {searchResults?.map((user: any) => {
          const isMember = existingMemberIds.includes(user.id);
          
          return (
            <div key={user.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
              <div className="flex items-center gap-3">
                <FramedAvatar
                  userId={user.id}
                  avatarUrl={user.avatar_url}
                  username={user.name}
                  sizeClassName="h-8 w-8"
                />
                <span className="font-medium">{user.name}</span>
              </div>
              
              {isMember ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3" /> Já é membro
                </span>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleInvite(user.id)}
                  disabled={inviteMutation.isPending}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
