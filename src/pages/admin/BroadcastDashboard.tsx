import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Radio, Play, Square, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// Types based on SQL schema
interface Broadcast {
  id: number;
  is_active: boolean;
  platform: 'twitch' | 'youtube';
  channel_id: string;
  title: string | null;
}

interface StreamPartner {
  id: number;
  platform: 'twitch' | 'youtube';
  channel_id: string;
  display_name: string | null;
  priority: number;
  is_enabled: boolean;
}

const BroadcastDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customChannel, setCustomChannel] = useState("");
  const [customPlatform, setCustomPlatform] = useState<'twitch' | 'youtube'>("twitch");
  const [customTitle, setCustomTitle] = useState("");

  // New Partner State
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerChannel, setNewPartnerChannel] = useState("");
  const [newPartnerPlatform, setNewPartnerPlatform] = useState<'twitch' | 'youtube'>("twitch");

  // Fetch Current Broadcast Status
  const { data: broadcast, isLoading: isLoadingBroadcast } = useQuery({
    queryKey: ["admin-broadcast"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as Broadcast;
    },
  });

  // Fetch Partners
  const { data: partners, isLoading: isLoadingPartners } = useQuery({
    queryKey: ["admin-stream-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stream_partners")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as StreamPartner[];
    },
  });

  // Mutation to Update Broadcast
  const updateBroadcastMutation = useMutation({
    mutationFn: async (payload: Partial<Broadcast>) => {
      const { error } = await supabase
        .from("broadcasts")
        .update(payload)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-broadcast"] });
      queryClient.invalidateQueries({ queryKey: ["active-broadcast"] });
      toast({ title: "Sucesso", description: "Status da transmissão atualizado." });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Mutation to Add Partner
  const addPartnerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stream_partners").insert({
        platform: newPartnerPlatform,
        channel_id: newPartnerChannel,
        display_name: newPartnerName,
        is_enabled: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stream-partners"] });
      toast({ title: "Sucesso", description: "Parceiro adicionado." });
      setIsAddPartnerOpen(false);
      setNewPartnerName("");
      setNewPartnerChannel("");
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Mutation to Delete Partner
  const deletePartnerMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("stream_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stream-partners"] });
      toast({ title: "Sucesso", description: "Parceiro removido." });
    },
    onError: (err) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });


  const goLive = (platform: 'twitch' | 'youtube', channel_id: string, title?: string) => {
    updateBroadcastMutation.mutate({
      is_active: true,
      platform,
      channel_id,
      title: title || "Transmissão Ao Vivo",
      // updated_at will be handled by DB or trigger if exists, or we leave it
    });
  };

  const stopBroadcast = () => {
    updateBroadcastMutation.mutate({ is_active: false });
  };

  const handleChannelInputChange = (value: string) => {
    let finalValue = value.trim();
    
    // Auto-extract from URL if it's a link
    if (finalValue.includes("youtube.com") || finalValue.includes("youtu.be")) {
      // 1. Check for specific Video ID (watch?v= or embed/ or youtu.be/)
      const videoMatch = finalValue.match(/(?:v=|embed\/|watch\?v=|&v=|youtu\.be\/)([^#\&\?]*).*/);
      // 2. Check for Channel ID (channel/UC...)
      const channelMatch = finalValue.match(/channel\/(UC[^#\&\?]*).*/);
      
      if (videoMatch && videoMatch[1] && videoMatch[1].length === 11) {
        finalValue = videoMatch[1];
      } else if (channelMatch && channelMatch[1]) {
        finalValue = channelMatch[1];
      } else if (finalValue.includes("/@")) {
        // Handle detected, but we can't embed handles directly easily without API
        const handleMatch = finalValue.match(/\/@([^#\&\?\/]*).*/);
        if (handleMatch) {
           toast({ 
             title: "Atenção: Handle do YouTube", 
             description: "URLs com '@' não funcionam direto no player. Use o ID do Canal (UC...) ou o ID do Vídeo.",
             variant: "destructive"
           });
           finalValue = handleMatch[1];
        }
      }
      
      if (customPlatform !== 'youtube') setCustomPlatform('youtube');
    } else if (finalValue.includes("twitch.tv")) {
      const twitchMatch = finalValue.match(/twitch\.tv\/([a-z0-9_]+)/i);
      if (twitchMatch && twitchMatch[1]) {
        finalValue = twitchMatch[1];
        if (customPlatform !== 'twitch') setCustomPlatform('twitch');
      }
    }
    
    setCustomChannel(finalValue);
  };

  const handleNewPartnerChannelChange = (value: string) => {
    let finalValue = value.trim();
    if (finalValue.includes("youtube.com") || finalValue.includes("youtu.be")) {
      const videoMatch = finalValue.match(/(?:v=|embed\/|watch\?v=|&v=|youtu\.be\/)([^#\&\?]*).*/);
      const channelMatch = finalValue.match(/channel\/(UC[^#\&\?]*).*/);
      
      if (videoMatch && videoMatch[1] && videoMatch[1].length === 11) {
        finalValue = videoMatch[1];
      } else if (channelMatch && channelMatch[1]) {
        finalValue = channelMatch[1];
      }
      if (newPartnerPlatform !== 'youtube') setNewPartnerPlatform('youtube');
    } else if (finalValue.includes("twitch.tv")) {
      const twitchMatch = finalValue.match(/twitch\.tv\/([a-z0-9_]+)/i);
      if (twitchMatch && twitchMatch[1]) {
        finalValue = twitchMatch[1];
        if (newPartnerPlatform !== 'twitch') setNewPartnerPlatform('twitch');
      }
    }
    setNewPartnerChannel(finalValue);
  }

  if (isLoadingBroadcast || isLoadingPartners) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Radio className="text-red-500" /> Gerenciar Transmissão
        </h1>
      </div>

      {/* STATUS PANEL */}
      <Card className={broadcast?.is_active ? "border-red-500/50 bg-red-500/5" : ""}>
        <CardHeader>
          <CardTitle>Status Atual: {broadcast?.is_active ? <Badge variant="destructive">AO VIVO</Badge> : <Badge variant="outline">OFFLINE</Badge>}</CardTitle>
          <CardDescription>Controle o que aparece na BroadcastBar da página inicial.</CardDescription>
        </CardHeader>
        <CardContent>
          {broadcast?.is_active ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Plataforma:</strong> {broadcast.platform}</div>
                <div><strong>Canal ID:</strong> {broadcast.channel_id}</div>
                <div className="col-span-2"><strong>Título:</strong> {broadcast.title}</div>
              </div>
              <Button variant="destructive" onClick={stopBroadcast} disabled={updateBroadcastMutation.isPending}>
                <Square className="mr-2 h-4 w-4" /> Parar Transmissão
              </Button>
            </div>
          ) : (
            <div className="text-muted-foreground">Nenhuma transmissão ativa no momento.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PARTNERS LIST */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Parceiros Cadastrados</CardTitle>
              <CardDescription>Selecione um parceiro para transmitir.</CardDescription>
            </div>
            <Dialog open={isAddPartnerOpen} onOpenChange={setIsAddPartnerOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Streamer Parceiro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome do Streamer</Label>
                    <Input value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} placeholder="Ex: KSN YNUI" />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                     <RadioGroup value={newPartnerPlatform} onValueChange={(v: 'twitch'|'youtube') => setNewPartnerPlatform(v)} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="twitch" id="np-twitch" />
                          <Label htmlFor="np-twitch">Twitch</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="youtube" id="np-youtube" />
                          <Label htmlFor="np-youtube">YouTube</Label>
                        </div>
                      </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label>ID do Canal / URL</Label>
                    <Input value={newPartnerChannel} onChange={e => handleNewPartnerChannelChange(e.target.value)} placeholder="Ex: ksnynui" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => addPartnerMutation.mutate()} disabled={addPartnerMutation.isPending || !newPartnerName || !newPartnerChannel}>
                    {addPartnerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {partners?.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group">
                  <div className="flex flex-col">
                    <span className="font-medium">{partner.display_name || partner.channel_id}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {partner.platform === 'twitch' ? 'Twitch' : 'YouTube'} • {partner.channel_id}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={broadcast?.is_active && broadcast.channel_id === partner.channel_id ? "secondary" : "default"}
                      onClick={() => goLive(partner.platform, partner.channel_id, `Ao vivo: ${partner.display_name}`)}
                      disabled={updateBroadcastMutation.isPending || (broadcast?.is_active && broadcast.channel_id === partner.channel_id)}
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deletePartnerMutation.mutate(partner.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {partners?.length === 0 && <div className="text-center text-muted-foreground">Nenhum parceiro encontrado.</div>}
            </div>
          </CardContent>
        </Card>

        {/* MANUAL CONTROL */}
        <Card>
          <CardHeader>
            <CardTitle>Transmissão Manual</CardTitle>
            <CardDescription>Configure uma transmissão personalizada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <RadioGroup value={customPlatform} onValueChange={(v: 'twitch'|'youtube') => setCustomPlatform(v)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="twitch" id="r-twitch" />
                  <Label htmlFor="r-twitch">Twitch</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="youtube" id="r-youtube" />
                  <Label htmlFor="r-youtube">YouTube</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>ID do Canal / Video ID</Label>
              <Input 
                placeholder={customPlatform === 'twitch' ? "Ex: ksnynui" : "Ex: video_id_here"} 
                value={customChannel}
                onChange={(e) => handleChannelInputChange(e.target.value)}
                className={customPlatform === 'youtube' && customChannel.includes('@') ? "border-red-500 bg-red-500/10" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {customPlatform === 'twitch' ? "Nome de usuário do canal ou URL." : "ID do vídeo, ID do canal (UC...) ou URL."}
              </p>
              {customPlatform === 'youtube' && customChannel.includes('@') && (
                <p className="text-[10px] text-red-500 font-bold">
                  ⚠️ YouTube Handles (@...) não funcionam em embeds. Use o UC... do canal.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Título (Opcional)</Label>
              <Input 
                placeholder="Ex: Grande Final!" 
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
              />
            </div>

            <Button 
              className="w-full" 
              onClick={() => goLive(customPlatform, customChannel, customTitle || undefined)}
              disabled={!customChannel || updateBroadcastMutation.isPending}
            >
              <Play className="mr-2 h-4 w-4" /> Iniciar Transmissão Manual
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BroadcastDashboard;
