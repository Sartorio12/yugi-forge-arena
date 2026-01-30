import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2 } from "lucide-react";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Link } from "react-router-dom";

export const TopRivalriesWidget = () => {
  const { data: rivalries, isLoading } = useQuery({
    queryKey: ["topRivalries"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_top_rivalries", { limit_count: 5 });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-red-500" /></div>;
  if (!rivalries || rivalries.length === 0) return null;

  return (
    <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-red-500">
          <Swords className="fill-red-500/20 h-5 w-5" />
          Rivalidades 2026
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rivalries.map((r: any, index: number) => (
            <div key={`${r.player1_id}-${r.player2_id}`} className="flex items-center justify-between">
              <div className="flex items-center -space-x-2 min-w-[60px]">
                 <Link to={`/profile/${r.player1_id}`}>
                    <FramedAvatar userId={r.player1_id} avatarUrl={r.player1_avatar} sizeClassName="h-8 w-8 ring-2 ring-background" />
                 </Link>
                 <Link to={`/profile/${r.player2_id}`}>
                    <FramedAvatar userId={r.player2_id} avatarUrl={r.player2_avatar} sizeClassName="h-8 w-8 ring-2 ring-background" />
                 </Link>
              </div>
              
              <div className="flex-1 px-3 text-xs text-center overflow-hidden">
                 <Link to={`/rivalry`} className="hover:underline text-muted-foreground truncate block">
                    {r.player1_name} vs {r.player2_name}
                 </Link>
              </div>

              <div className="font-bold text-sm bg-secondary/50 px-2 py-1 rounded text-center min-w-[30px]">
                {r.matches_count}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
