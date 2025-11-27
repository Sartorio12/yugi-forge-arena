import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";

interface YgoProCard {
  id: number;
  name: string;
  type: string;
  desc: string;
  card_images: {
    image_url: string;
  }[];
}

const fetchRandomCard = async (): Promise<YgoProCard> => {
  const response = await fetch("https://db.ygoprodeck.com/api/v7/randomcard.php");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data;
};

export const CardOfTheDay = () => {
  const { data: card, isLoading, isError, error } = useQuery<YgoProCard, Error>({
    queryKey: ["cardOfTheDay"],
    queryFn: fetchRandomCard,
    staleTime: 1000 * 60 * 60 * 24, // Refetch once a day
  });

  return (
    <Card className="bg-gray-800/50 border-border">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Card do Dia</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center p-4 min-h-[400px]">
        {isLoading ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        ) : isError ? (
          <div className="text-center text-red-500">
            <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
            <p>Erro ao buscar o card.</p>
            <p className="text-xs">{error.message}</p>
          </div>
        ) : card ? (
          <div className="text-center">
            <h3 className="text-xl font-bold text-primary mb-4">{card.name}</h3>
            {card.card_images && card.card_images[0] && (
              <img
                src={card.card_images[0].image_url}
                alt={card.name}
                className="mx-auto rounded-lg mb-4 w-64"
              />
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
