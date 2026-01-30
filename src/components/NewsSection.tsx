import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Newspaper } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FramedAvatar } from "./FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewsPost {
  id: number;
  title: string;
  label?: string | null;
  content: string | null;
  created_at: string;
  banner_url: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string;
    equipped_frame_url: string | null;
    clan_members: {
      clans: { tag: string } | null;
    } | null;
  } | null;
}

export const NewsSection = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["newsPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news_posts')
        .select(`
          id,
          title,
          label,
          created_at,
          banner_url,
          profiles (
            id,
            username,
            avatar_url,
            equipped_frame_url,
            clan_members (
              clans ( tag )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as NewsPost[];
    },
  });

  return (
    <section className="py-4">
      <div className="flex items-center justify-between mb-6 px-1">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          Últimas Notícias
        </h2>
        <Link to="/news" className="text-sm text-muted-foreground hover:text-primary transition-colors">
          Ver todas
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {posts.map((post) => (
                        <Link
                          key={post.id}
                          to={`/news/${post.id}`}
                          className="group relative flex flex-col h-[180px] sm:h-[220px] md:h-[280px] overflow-hidden rounded-lg border border-border bg-transparent hover:bg-white/5 hover:border-primary/50 transition-all duration-300"
                        >
                          {/* Image Section - now takes full height of the card */}
                          <div className="absolute inset-0 w-full h-full">
                            {post.banner_url ? (
                              <img
                                src={post.banner_url}
                                alt={post.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-secondary/20 flex items-center justify-center">
                                <Newspaper className="h-8 w-8 md:h-12 md:w-12 text-muted-foreground/20" />
                              </div>
                            )}
                            {/* Dark Gradient Overlay for text readability */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            
                            {/* "Notícia" Badge */}
                            <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-10">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold bg-primary/90 text-primary-foreground uppercase tracking-wider shadow-sm">
                                {post.label || "Notícia"}
                              </span>
                            </div>
            
                            {/* Content (Title, Author, Date - positioned at the bottom) */}
                            <div className="absolute inset-x-0 bottom-0 p-2 md:p-4 z-10">
                              <h3 className="text-xs md:text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-1 md:mb-2">
                                {post.title}
                              </h3>
                              <div className="flex items-center gap-1 md:gap-2 text-[9px] md:text-xs text-gray-300">
                                {/* Author */}
                                {post.profiles && (
                                  <div className="flex items-center gap-1 md:gap-1.5">
                                    <FramedAvatar
                                      userId={post.profiles.id}
                                      avatarUrl={post.profiles.avatar_url}
                                      frameUrl={post.profiles.equipped_frame_url}
                                      username={post.profiles.username}
                                      sizeClassName="h-4 w-4 md:h-6 md:w-6 aspect-square"
                                    />
                                    <span className="font-medium truncate max-w-[60px] md:max-w-[100px]">
                                      {post.profiles.username}
                                    </span>
                                  </div>
                                )}
                                <span className="text-gray-500">•</span>
                                <span>{format(new Date(post.created_at), "d MMM", { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                        </Link>          ))}
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg bg-transparent">
          <Newspaper className="mx-auto h-12 w-12 mb-4 opacity-20" />
          <p>Nenhuma notícia encontrada.</p>
        </div>
      )}
    </section>
  );
};
