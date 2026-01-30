import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// This interface should match the structure of a row from the 'cards' table
interface CardData {
  id: number;
  name: string;
  pt_name: string | null;
  type: string;
  description: string;
  image_url: string;
}

const fetchRandomCard = async (): Promise<CardData> => {
  const { data, error } = await supabase.rpc('get_random_card');
  
  if (error) {
    console.error("Error fetching random card:", error);
    throw new Error("Failed to fetch random card from database.");
  }
  
  // The RPC returns a single object which is the table row
  return data;
};

export const CardOfTheDay = () => {
  const { t, i18n } = useTranslation();
  const { data: card, isLoading, isError, error } = useQuery<CardData, Error>({
    queryKey: ["cardOfTheDay"],
    queryFn: fetchRandomCard,
    staleTime: 1000 * 60 * 60 * 24, // Refetch once a day
  });

  const cardName = (i18n.language === 'pt' && card?.pt_name) ? card.pt_name : card?.name;

  return (
    <Card className="bg-[hsl(0_0%_12%)] border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold text-center">{t('card_of_day.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2 pb-4 min-h-[400px]">
        {isLoading ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        ) : isError ? (
          <div className="text-center text-red-500">
            <AlertTriangle className="mx-auto h-12 w-12 mb-2" />
            <p>{t('card_of_day.error')}</p>
            <p className="text-xs">{error.message}</p>
          </div>
        ) : card ? (
          <div className="text-center">
            {card.image_url && (
              <img
                src={card.image_url}
                alt={cardName}
                className="mx-auto rounded-lg mb-1 w-full"
              />
            )}
            <p className="text-sm font-bold mt-2 text-muted-foreground">{cardName}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
