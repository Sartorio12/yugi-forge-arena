import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Badge } from "@/components/ui/badge";

interface SearchProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  equipped_frame_url: string | null;
  clan_tag: string | null;
}

const TitleDistributionPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  
  // Colors
  const [borderColor, setBorderColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState("#333333");
  
  const { toast } = useToast();

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ["admin-profiles-search", searchTerm],
    queryFn: async () => {
      // If search term is empty, fetch basic list? Or just require search?
      // Let's fetch basic list if empty.
      if (!searchTerm) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, equipped_frame_url, clan_members(clans(tag))")
          .limit(20);
          
        if (error) throw error;
        // Transform to match SearchProfile interface
        return data.map((p: any) => ({
          id: p.id,
          username: p.username,
          avatar_url: p.avatar_url,
          equipped_frame_url: p.equipped_frame_url,
          clan_tag: p.clan_members?.[0]?.clans?.tag || null
        })) as SearchProfile[];
      }

      const { data, error } = await supabase.rpc("search_profiles_for_admin", {
        p_search_term: searchTerm
      });
      if (error) throw error;
      return data.map((p: any) => ({
        id: p.profile_id,
        username: p.username,
        avatar_url: p.avatar_url,
        equipped_frame_url: p.equipped_frame_url,
        clan_tag: p.clan_tag
      })) as SearchProfile[];
    },
    // Keep previous data while fetching new to avoid flickering
    placeholderData: (previousData) => previousData,
  });

  const grantTitlesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("grant_title_to_users", {
        p_user_ids: selectedUsers,
        p_title: title,
        p_border_color: borderColor,
        p_text_color: textColor,
        p_background_color: backgroundColor,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: `Título distribuído para ${selectedUsers.length} usuários.` });
      setSelectedUsers([]);
      setTitle("");
      // Optional: Reset colors
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao distribuir títulos.",
        variant: "destructive",
      });
    },
  });

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllVisible = () => {
    if (!profiles) return;
    const allVisibleIds = profiles.map(p => p.id);
    const allSelected = allVisibleIds.every(id => selectedUsers.includes(id));
    
    if (allSelected) {
      setSelectedUsers(prev => prev.filter(id => !allVisibleIds.includes(id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...allVisibleIds])]);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Users className="h-8 w-8" />
          Distribuição de Títulos
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Selecionar Jogadores</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou tag do clã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} usuários selecionados
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAllVisible}>
                  {profiles && profiles.length > 0 && profiles.every(p => selectedUsers.includes(p.id)) ? "Desmarcar Visíveis" : "Selecionar Visíveis"}
                </Button>
              </div>

              <div className="border rounded-md divide-y max-h-[500px] overflow-y-auto">
                {error ? (
                  <div className="p-8 text-center text-destructive">
                    Erro ao carregar: {error.message}
                  </div>
                ) : isLoading && !profiles ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : profiles?.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </div>
                ) : (
                  profiles?.map((profile) => (
                    <div
                      key={profile.id}
                      className={`flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedUsers.includes(profile.id) ? "bg-muted" : ""
                      }`}
                      onClick={() => handleToggleUser(profile.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(profile.id)}
                        onCheckedChange={() => handleToggleUser(profile.id)}
                      />
                      <FramedAvatar
                        avatarUrl={profile.avatar_url}
                        frameUrl={profile.equipped_frame_url}
                        username={profile.username}
                        sizeClassName="w-10 h-10"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-2">
                          {profile.username}
                          {profile.clan_tag && (
                            <span className="text-xs text-muted-foreground font-semibold px-1.5 py-0.5 bg-secondary rounded">
                              [{profile.clan_tag}]
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Title Details */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Detalhes do Título</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nome do Título</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Campeão Regional"
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="textColor">Cor do Texto</Label>
                    <div className="flex gap-2">
                      <Input
                        id="textColor"
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bgColor">Cor de Fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bgColor"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="borderColor">Cor da Borda</Label>
                    <div className="flex gap-2">
                      <Input
                        id="borderColor"
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label>Pré-visualização</Label>
                  <div className="mt-2 flex items-center justify-center p-4 border rounded-md bg-background">
                    <Badge
                      className="rounded-md px-2 py-0.5 text-xs font-normal border-2"
                      style={{ 
                        color: textColor,
                        backgroundColor: backgroundColor,
                        borderColor: borderColor
                      }}
                    >
                      {title || "Nome do Título"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    A visualização final pode variar ligeiramente.
                  </p>
                </div>

                <Button
                  className="w-full mt-4"
                  disabled={selectedUsers.length === 0 || !title.trim() || grantTitlesMutation.isPending}
                  onClick={() => grantTitlesMutation.mutate()}
                >
                  {grantTitlesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Distribuir Título ({selectedUsers.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitleDistributionPage;
