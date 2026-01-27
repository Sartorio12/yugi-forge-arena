import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";

interface DiscordUsernameModalProps {
  userId: string | undefined;
}

export const DiscordUsernameModal = ({ userId }: DiscordUsernameModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [discordUsername, setDiscordUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkProfile = async () => {
      if (!userId) return;

      // Check if we already showed the modal in this session
      const hasShownModal = sessionStorage.getItem("discordModalShown");
      if (hasShownModal) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("discord_username")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          return;
        }

        // If discord_username is missing or empty, open the modal
        if (!data.discord_username || data.discord_username.trim() === "") {
          setIsOpen(true);
          sessionStorage.setItem("discordModalShown", "true");
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [userId]);

  const handleSave = async () => {
    if (!discordUsername.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, digite seu nick do Discord.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ discord_username: discordUsername.trim() })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Seu nick do Discord foi salvo.",
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        // Prevent closing by clicking outside if strictly required, 
        // strictly speaking we allow closing but it will pop up again on refresh.
        // For a better UX, let's allow closing via the X or cancel, but encourage filling it.
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#5865F2]" />
            Nova Integração: Discord
          </DialogTitle>
          <DialogDescription>
            Para facilitar a organização dos torneios e pareamentos, agora pedimos que você vincule seu nick do Discord ao seu perfil.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="discord" className="text-right">
              Discord
            </Label>
            <Input
              id="discord"
              placeholder="Ex: usuario#1234"
              className="col-span-3"
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Depois</Button>
          <Button onClick={handleSave} disabled={isLoading} className="bg-[#5865F2] hover:bg-[#4752C4]">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
