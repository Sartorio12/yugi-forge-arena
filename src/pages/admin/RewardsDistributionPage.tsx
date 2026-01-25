import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Users, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SearchProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  equipped_frame_url: string | null;
  clan_tag: string | null;
}

// Hardcoded list of frames for now, ideally this would come from a database table or storage list
const AVAILABLE_FRAMES = [
  // Admin Frames
  { name: "Link Master Frame", url: "/borders/adm/link_master_frame_round.png" },

  // Random Frames
  { name: "Blue-Eyes White Dragon", url: "/borders/random/blue_eyes_white_dragon_round.png" },
  { name: "Brain Control", url: "/borders/random/brain_control_round.png" },
  { name: "Called by the Grave", url: "/borders/random/called_by_the_grave_round.png" },
  { name: "Celebration of Spring Breeze", url: "/borders/random/celebration_of_spring_breeze_round.png" },
  { name: "Dark Magical Circle", url: "/borders/random/dark_magical_circle_round.png" },
  { name: "Dark Attribute", url: "/borders/random/dark.png" },
  { name: "Earth Attribute", url: "/borders/random/earth.png" },
  { name: "Evil Eye of Selene", url: "/borders/random/evil_eye_of_selene_round.png" },
  { name: "Festive Ornament", url: "/borders/random/festive_ornament.png" },
  { name: "Fire Attribute", url: "/borders/random/fire.png" },
  { name: "Flock Together", url: "/borders/random/flock_together_round.png" },
  { name: "Flurry of Cherry Blossoms", url: "/borders/random/flurry_of_cherry_blossoms_round.png" },
  { name: "Frost Frame", url: "/borders/random/frost_frame_round.png" },
  { name: "Leodrake's Mane", url: "/borders/random/leodrakes_mane_round.png" },
  { name: "Light Attribute", url: "/borders/random/light.png" },
  { name: "Magic Cylinder", url: "/borders/random/magic_cylinder_round.png" },
  { name: "Maple Maiden", url: "/borders/random/maple_maiden_round.png" },
  { name: "Neon Sign", url: "/borders/random/neon_sign_round.png" },
  { name: "Night Festival in Costume", url: "/borders/random/night_festival_in_costume_round.png" },
  { name: "Polymerization", url: "/borders/random/polymerization_round.png" },
  { name: "Rikka", url: "/borders/random/rikka.png" },
  { name: "Sky Striker Ace Raye", url: "/borders/random/sky_striker_ace_raye_round.png" },
  { name: "The Legend of Duelist Quarter Century", url: "/borders/random/the_legend_of_duelist_quarter_century_frame.png" },
  { name: "Tropical Seaside", url: "/borders/random/tropical_seaside_round.png" },
  { name: "Water Attribute", url: "/borders/random/water.png" },
  { name: "WCS 2023", url: "/borders/random/wcs_2023_party_favor.png" },
  { name: "WCS 2024", url: "/borders/random/wcs_2024_party_favor.png" },
  { name: "Wind Attribute", url: "/borders/random/wind.png" },
];

const RewardsDistributionPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Title State
  const [title, setTitle] = useState("");
  const [borderColor, setBorderColor] = useState("#000000");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [backgroundColor, setBackgroundColor] = useState("#333333");

  // Frame State
  const [selectedFrame, setSelectedFrame] = useState<string>("");

  const { toast } = useToast();

  const { data: tournaments } = useQuery({
    queryKey: ["admin-tournaments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title")
        .order("event_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ["admin-profiles-search", searchTerm, selectedTournamentId],
    queryFn: async () => {
      // 1. If Tournament Selected, fetch participants
      if (selectedTournamentId && selectedTournamentId !== "all") {
        const { data, error } = await supabase
          .from("tournament_participants")
          .select(`
            user_id,
            profiles:user_id (
              id,
              username,
              avatar_url,
              equipped_frame_url
            ),
            clans:clan_id (
              tag
            )
          `)
          .eq("tournament_id", selectedTournamentId);
          
        if (error) throw error;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((p: any) => ({
          id: p.profiles?.id,
          username: p.profiles?.username || "Unknown",
          avatar_url: p.profiles?.avatar_url,
          equipped_frame_url: p.profiles?.equipped_frame_url,
          clan_tag: p.clans?.tag || null
        })) as SearchProfile[];
      }

      // 2. If Search Term exists
      if (searchTerm) {
        const { data, error } = await supabase.rpc("search_profiles_for_admin", {
          p_search_term: searchTerm
        });
        if (error) throw error;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((p: any) => ({
          id: p.profile_id,
          username: p.username,
          avatar_url: p.avatar_url,
          equipped_frame_url: p.equipped_frame_url,
          clan_tag: p.clan_tag
        })) as SearchProfile[];
      }

      // 3. Default: latest profiles
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, equipped_frame_url, clan_members(clans(tag))")
        .limit(20);
        
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((p: any) => ({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        equipped_frame_url: p.equipped_frame_url,
        clan_tag: p.clan_members?.[0]?.clans?.tag || null
      })) as SearchProfile[];
    },
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
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao distribuir títulos.",
        variant: "destructive",
      });
    },
  });

  const grantFrameMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("grant_frame_to_users", {
        p_user_ids: selectedUsers,
        p_frame_url: selectedFrame,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: `Borda distribuída para ${selectedUsers.length} usuários.` });
      setSelectedUsers([]);
      setSelectedFrame("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao distribuir borda.",
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
          <Crown className="h-8 w-8 text-primary" />
          Distribuição de Recompensas
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Selecionar Jogadores</h2>
              
              <div className="space-y-4 mb-4">
                {/* Tournament Selector */}
                <div className="space-y-2">
                  <Label>Filtrar por Torneio</Label>
                  <Select 
                    value={selectedTournamentId} 
                    onValueChange={(val) => {
                      setSelectedTournamentId(val);
                      if (val !== "all") setSearchTerm(""); // Clear search if tournament selected
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os jogadores (Recentes)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os jogadores (Recentes)</SelectItem>
                      {tournaments?.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou tag do clã..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value) setSelectedTournamentId("all"); // Clear tournament if searching
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  {selectedUsers.length} usuários selecionados
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAllVisible}>
                  {profiles && profiles.length > 0 && profiles.every(p => selectedUsers.includes(p.id)) ? "Desmarcar Visíveis" : "Selecionar Visíveis"}
                </Button>
              </div>

              <div className="border rounded-md divide-y max-h-[600px] overflow-y-auto">
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

          {/* Right Column: Reward Details */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border shadow-sm sticky top-24">
              <Tabs defaultValue="titles" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="titles">
                    <Shield className="w-4 h-4 mr-2" />
                    Títulos
                  </TabsTrigger>
                  <TabsTrigger value="frames">
                    <Users className="w-4 h-4 mr-2" />
                    Bordas
                  </TabsTrigger>
                </TabsList>

                {/* --- TITLES TAB --- */}
                <TabsContent value="titles" className="space-y-4">
                  <h3 className="text-lg font-semibold">Configurar Título</h3>
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
                </TabsContent>

                {/* --- FRAMES TAB --- */}
                <TabsContent value="frames" className="space-y-4">
                  <h3 className="text-lg font-semibold">Escolher Borda</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Borda Disponível</Label>
                      <Select value={selectedFrame} onValueChange={setSelectedFrame}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma borda..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_FRAMES.map((frame) => (
                            <SelectItem key={frame.url} value={frame.url}>
                              <div className="flex items-center gap-3">
                                <div className="relative w-8 h-8 flex-shrink-0">
                                  <img 
                                    src={frame.url} 
                                    alt="" 
                                    className="absolute inset-0 w-full h-full object-contain z-10"
                                  />
                                  <div className="absolute inset-1 bg-muted rounded-full" />
                                </div>
                                <span>{frame.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedFrame && (
                      <div className="pt-4 border-t">
                        <Label>Pré-visualização</Label>
                        <div className="mt-2 flex flex-col items-center justify-center p-4 border rounded-md bg-background gap-4">
                           <div className="relative w-24 h-24">
                             <img 
                               src={selectedFrame} 
                               alt="Frame Preview" 
                               className="absolute inset-0 w-full h-full object-contain z-10"
                             />
                             <div className="absolute inset-2 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                               <Users className="w-8 h-8 text-muted-foreground/50" />
                             </div>
                           </div>
                           <p className="text-sm font-medium">
                             {AVAILABLE_FRAMES.find(f => f.url === selectedFrame)?.name}
                           </p>
                        </div>
                      </div>
                    )}

                    <Button
                      className="w-full mt-4"
                      disabled={selectedUsers.length === 0 || !selectedFrame || grantFrameMutation.isPending}
                      onClick={() => grantFrameMutation.mutate()}
                    >
                      {grantFrameMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Distribuir Borda ({selectedUsers.length})
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RewardsDistributionPage;