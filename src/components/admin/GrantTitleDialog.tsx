import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle } from "lucide-react";

interface GrantTitleDialogProps {
  userId: string;
  username: string;
}

export const GrantTitleDialog = ({ userId, username }: GrantTitleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const grantTitleMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const { error } = await supabase.rpc("grant_title", { 
        p_user_id: userId, 
        p_title: newTitle 
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: `Título concedido a ${username}.` });
      setOpen(false);
      setTitle("");
      // Invalidate queries if necessary, though user titles are fetched in TitleInventory
      // Maybe invalidate 'user-titles' if we were showing them, but admins don't see the user's inventory directly here,
      // unless we add a list of titles the user has.
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao conceder título.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) return;
    grantTitleMutation.mutate(title.trim());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Conceder Título
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conceder Título a {username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Ex: Mestre dos Magos"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={grantTitleMutation.isPending || !title.trim()}>
            {grantTitleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Conceder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
