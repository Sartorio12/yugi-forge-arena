import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";

interface DeckCardProps {
  id: number;
  deckName: string;
  cardCount?: number;
}

const DeckCard = ({ id, deckName, cardCount = 0 }: DeckCardProps) => {
  return (
    <Link to={`/deck/${id}`}>
      <Card className="p-6 group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-gradient-card">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
              {deckName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {cardCount} cartas
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default DeckCard;
