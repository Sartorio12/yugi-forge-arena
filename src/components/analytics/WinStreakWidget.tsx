import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Loader2 } from "lucide-react";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Link } from "react-router-dom";

export const WinStreakWidget = () => {
  const { data: streaks, isLoading } = useQuery({
    queryKey: ["winStreaks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_current_win_streaks", { limit_count: 5 });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-orange-500" /></div>;
  if (!streaks || streaks.length === 0) return null;

  return (
    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-orange-500">
          <Flame className="fill-orange-500 h-5 w-5" />
          Win Streaks 2026
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {streaks.map((s: any, index: number) => (
            <div key={s.user_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`text-lg font-bold w-4 text-center ${index === 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}>{index + 1}</span>
                <Link to={`/profile/${s.user_id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <FramedAvatar userId={s.user_id} avatarUrl={s.avatar_url} sizeClassName="h-8 w-8" />
                    <span className="font-medium text-sm truncate max-w-[100px] sm:max-w-[120px]">{s.username}</span>
                </Link>
              </div>
              <div className="flex items-center gap-1 bg-orange-500/10 px-2 py-1 rounded-full border border-orange-500/20">
                <Flame className="h-3 w-3 text-orange-500 fill-orange-500" />
                <span className="font-bold text-orange-500 text-xs">{s.streak}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
