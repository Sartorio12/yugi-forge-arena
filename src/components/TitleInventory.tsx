import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface TitleInventoryProps {
  userId: string;
  currentEquippedTitles: any[] | null;
  onClose?: () => void;
}

interface UserTitle {
  id: number;
  user_id: string;
  title: string;
  border_color: string | null;
  text_color: string | null;
  background_color: string | null;
  created_at: string;
}

export const TitleInventory = ({ userId, currentEquippedTitles, onClose }: TitleInventoryProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userTitles, isLoading } = useQuery<UserTitle[]>({
    queryKey: ["user-titles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_titles")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const equipTitlesMutation = useMutation({
    mutationFn: async (titles: string[]) => {
      const { error } = await supabase.rpc("equip_titles", { p_titles: titles });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso!", description: "Títulos atualizados." });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar títulos.",
        variant: "destructive",
      });
    },
  });

  const equippedNames = currentEquippedTitles?.map((t: any) => typeof t === 'string' ? t : t.name) || [];

  const handleToggleTitle = (title: string) => {
    const current = equippedNames;
    let newTitles: string[];

    if (current.includes(title)) {
      newTitles = current.filter(t => t !== title);
    } else {
      if (current.length >= 3) {
        toast({
          title: "Limite atingido",
          description: "Você só pode equipar até 3 títulos.",
          variant: "destructive",
        });
        return;
      }
      newTitles = [...current, title];
    }
    
    equipTitlesMutation.mutate(newTitles);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!userTitles || userTitles.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não possui títulos.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {userTitles.map((t) => {
        const isEquipped = equippedNames.includes(t.title);
        return (
          <div 
            key={t.id} 
            className={`cursor-pointer select-none transition-all ${equipTitlesMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => handleToggleTitle(t.title)}
          >
            <Badge 
              variant={isEquipped ? "default" : "outline"}
              className="px-3 py-1 text-sm hover:bg-primary/90 transition-all border-2"
              style={{ 
                borderColor: t.border_color || undefined,
                color: t.text_color || undefined,
                backgroundColor: isEquipped ? undefined : (t.background_color || undefined) // Only apply bg if not selected (selected uses default) - Wait, user wants custom background.
                // If selected, we might want to keep custom background but maybe darken it?
                // Default Badge behavior handles selection state.
                // Let's force background color always if present, but handle hover?
                // If I set backgroundColor, it overrides variant styles.
              }}
            >
              <span style={{ color: t.text_color || undefined }}>{t.title}</span>
            </Badge>
          </div>
        );
      })}
    </div>
  );
};
