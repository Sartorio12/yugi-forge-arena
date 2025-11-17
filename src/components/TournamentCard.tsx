import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TournamentCardProps {
  id: number;
  title: string;
  bannerImageUrl?: string;
  eventDate: string;
  status: string;
}

const TournamentCard = ({
  id,
  title,
  bannerImageUrl,
  eventDate,
  status,
}: TournamentCardProps) => {
  return (
    <Link to={`/tournaments/${id}`}>
      <Card className="overflow-hidden group cursor-pointer hover:shadow-glow transition-all duration-300 border-border bg-gray-800/50">
        <div className="relative h-48 overflow-hidden">
          {bannerImageUrl ? (
            <img
              src={bannerImageUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
              <Users className="h-16 w-16 text-primary-foreground opacity-50" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status === 'Aberto' 
                ? 'bg-primary/90 text-primary-foreground' 
                : 'bg-muted/90 text-muted-foreground'
            }`}>
              {status}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(eventDate), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
};

export default TournamentCard;
