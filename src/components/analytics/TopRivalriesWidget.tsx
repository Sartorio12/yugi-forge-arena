import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Loader2, Flame } from "lucide-react";
import { FramedAvatar } from "@/components/FramedAvatar";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export const TopRivalriesWidget = () => {
  const { t } = useTranslation();
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
    <Card className="border-red-500/20 bg-gradient-to-br from-red-500/10 via-background to-background h-fit overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <Swords className="h-16 w-16 text-red-500 -rotate-12" />
      </div>
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-black italic tracking-tighter text-red-500">
          <Flame className="h-5 w-5 fill-red-500 animate-pulse" />
          {t('top_rivalries.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rivalries.map((r: any, index: number) => (
            <Link 
              to="/rivalry" 
              key={`${r.player1_id}-${r.player2_id}`} 
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all group/item"
            >
              <div className="flex items-center -space-x-3">
                <div className="relative z-10">
                   <FramedAvatar userId={r.player1_id} avatarUrl={r.player1_avatar} sizeClassName="h-10 w-10 ring-2 ring-background shadow-lg" />
                </div>
                <div className="relative z-0">
                   <FramedAvatar userId={r.player2_id} avatarUrl={r.player2_avatar} sizeClassName="h-10 w-10 ring-2 ring-background shadow-lg" />
                </div>
              </div>
              
              <div className="flex-1 px-4 text-left overflow-hidden">
                 <div className="flex flex-col">
                    <span className="text-xs font-black truncate max-w-[120px] uppercase tracking-tight">
                        {r.player1_name} <span className="text-red-500/50">vs</span> {r.player2_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">Encontros épicos</span>
                 </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="text-xl font-black text-red-500 leading-none">
                  {r.matches_count}
                </div>
                <span className="text-[8px] font-black uppercase text-muted-foreground">Duelos</span>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
