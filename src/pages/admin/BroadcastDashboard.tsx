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
import { Loader2, Radio, Play, Square } from "lucide-react";

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
      toast({ title: "Sucesso", description: "Status da transmissão atualizado." });
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
          <CardHeader>
            <CardTitle>Parceiros Cadastrados</CardTitle>
            <CardDescription>Selecione um parceiro para transmitir imediatamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {partners?.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-medium">{partner.display_name || partner.channel_id}</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {partner.platform === 'twitch' ? 'Twitch' : 'YouTube'} • {partner.channel_id}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant={broadcast?.is_active && broadcast.channel_id === partner.channel_id ? "secondary" : "default"}
                    onClick={() => goLive(partner.platform, partner.channel_id, `Ao vivo: ${partner.display_name}`)}
                    disabled={updateBroadcastMutation.isPending || (broadcast?.is_active && broadcast.channel_id === partner.channel_id)}
                  >
                    <Play className="mr-2 h-3 w-3" /> Transmitir
                  </Button>
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
                onChange={(e) => setCustomChannel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {customPlatform === 'twitch' ? "Nome de usuário do canal." : "ID do vídeo (não o canal) para embed."}
              </p>
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
