import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, Trash2, Pencil, Lock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface DeckCardProps {
  id: number;
  deckName: string;
  cardCount?: number;
  isPrivate?: boolean;
  is_genesys?: boolean;
  onDelete: (id: number) => void;
  isOwner: boolean; // Added isOwner prop
}

const DeckCard = ({ id, deckName, cardCount = 0, isPrivate = false, is_genesys = false, onDelete, isOwner }: DeckCardProps) => {
  return (
    <Card className="p-4 group transition-all duration-300 border-border bg-gradient-card flex flex-col">
      <Link to={`/deck/${id}`} className="flex-grow">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                {deckName}
              </h3>
              {is_genesys && (
                <Badge className="bg-violet-500">Genesys</Badge>
              )}
              {isPrivate ? (
                <Badge variant="destructive">Privado</Badge>
              ) : (
                <Badge variant="secondary">Público</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{cardCount} cartas</p>
          </div>
        </div>
      </Link>
      {isOwner && ( // Conditional rendering for owner-only actions
        <div className="border-t border-border/50 mt-4 pt-4 flex justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/deck-builder?edit=${id}`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso irá deletar permanentemente o deck "{deckName}" e todas as suas cartas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(id)}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
};

export default DeckCard;
