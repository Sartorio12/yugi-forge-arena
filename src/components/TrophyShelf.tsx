import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Database } from '@/integrations/supabase/types';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type UserTournamentBanner = Database['public']['Tables']['user_tournament_banners']['Row'];

interface TrophyShelfProps {
  banners: UserTournamentBanner[];
  isOwner?: boolean;
  onDelete?: (id: number) => void;
}

const TrophyShelf: React.FC<TrophyShelfProps> = ({ banners, isOwner, onDelete }) => {
  if (!banners || banners.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Nenhum banner de torneio encontrado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {banners.map((banner) => (
        <Card key={banner.id} className="overflow-hidden relative group">
          <CardContent className="p-0">
            <AspectRatio ratio={1 / 1}>
              <img
                src={banner.banner_url}
                alt={banner.title || "Tournament Banner"}
                className="w-full h-full object-cover"
              />
            </AspectRatio>
            {isOwner && onDelete && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" className="h-8 w-8 shadow-md">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Banner?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O banner será removido do seu perfil.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(banner.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TrophyShelf;