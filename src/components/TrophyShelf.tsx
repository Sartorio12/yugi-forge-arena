import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio"; // Import AspectRatio
import { Database } from '@/integrations/supabase/types';

type UserTournamentBanner = Database['public']['Tables']['user_tournament_banners']['Row'];

interface TrophyShelfProps {
  banners: UserTournamentBanner[];
}

const TrophyShelf: React.FC<TrophyShelfProps> = ({ banners }) => {
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
        <Card key={banner.id} className="overflow-hidden">
          <CardContent className="p-0">
            <AspectRatio ratio={1 / 1}> {/* Use AspectRatio for 1:1 */}
              <img
                src={banner.banner_url}
                alt={banner.title || "Tournament Banner"} // Fallback alt text
                className="w-full h-full object-cover" // h-full now, as AspectRatio handles dimensions
              />
            </AspectRatio>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TrophyShelf;
