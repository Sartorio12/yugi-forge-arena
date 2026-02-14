import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";

interface FrameInventoryProps {
  userId: string;
  currentEquippedFrame: string | null;
  onClose: () => void;
}

interface UnlockedFrame {
  id: number;
  user_id: string;
  frame_url: string;
  unlocked_at: string;
}

export const FrameInventory = ({ userId, currentEquippedFrame, onClose }: FrameInventoryProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile(userId);

  const { data: unlockedFrames, isLoading } = useQuery<UnlockedFrame[]>({
    queryKey: ["unlocked-frames", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_unlocked_frames")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const equipFrameMutation = useMutation({
    mutationFn: async (frameUrl: string | null) => {
      const { error } = await supabase.rpc("equip_frame", { p_frame_url: frameUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Moldura atualizada." });
      // Invalidate both profile and user-frame queries to ensure all components update
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-frame", userId] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao equipar a moldura.",
        variant: "destructive",
      });
    },
  });

  const allAvailableFrames = [...(unlockedFrames || [])];
  if (profile && (profile.role === 'admin' || profile.role === 'organizer' || profile.id === '80193776-6790-457c-906d-ed45ea16df9f')) {
    if (!allAvailableFrames.some(frame => frame.frame_url === '/borders/adm/link_master_frame_round.png')) {
      allAvailableFrames.push({
        id: 999,
        user_id: userId,
        frame_url: '/borders/adm/link_master_frame_round.png',
        unlocked_at: new Date().toISOString(),
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-4 max-h-96 overflow-y-auto">
      <div className="relative aspect-square">
        <Button
          variant="outline"
          className={`w-full h-full p-2 flex flex-col items-center justify-center gap-2 transition-all ${
            !currentEquippedFrame ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => equipFrameMutation.mutate(null)}
          disabled={equipFrameMutation.isPending}
        >
          <Ban className="w-8 h-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Sem Moldura</span>
        </Button>
      </div>

      {allAvailableFrames.map((frame) => (
        <div key={frame.id} className="relative aspect-square">
          <Button
            variant="outline"
            className={`w-full h-full p-2 flex items-center justify-center transition-all ${
              currentEquippedFrame === frame.frame_url ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => equipFrameMutation.mutate(frame.frame_url)}
            disabled={equipFrameMutation.isPending}
          >
            <img src={frame.frame_url} alt="Moldura" className="max-w-full max-h-full" />
          </Button>
        </div>
      ))}
      {(allAvailableFrames.length === 0) && (
        <p className="col-span-full text-center text-muted-foreground">Nenhuma moldura desbloqueada.</p>
      )}
    </div>
  );
};
