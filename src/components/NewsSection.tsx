import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Loader2, Newspaper, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import UserDisplay from "./UserDisplay";

interface NewsPost {
  id: number;
  title: string;
  content: string | null;
  created_at: string;
  banner_url: string | null;
  profiles: {
    username: string;
    avatar_url: string;
    clan_members: {
      clans: { tag: string } | null;
    } | null; // clan_members is a single object or null
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
          created_at,
          banner_url,
          profiles (
            username,
            avatar_url,
            clan_members (
              clans ( tag )
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as NewsPost[];
    },
  });



  return (
    <section className="py-4 md:py-6 bg-[url('/bg-main.png')] bg-cover border border-gray-800 rounded-lg p-4">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          Últimas Notícias e Reports
        </h2>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Card key={post.id} className="h-full flex flex-col bg-gray-800/50 border-border text-center">
                              {post.banner_url && (
                                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                                  <img src={post.banner_url} alt={post.title} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <CardHeader>
                                <CardTitle className="text-base font-bold">{post.title}</CardTitle>
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                    <AvatarFallback>{post.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <UserDisplay profile={post.profiles} clan={post.profiles.clan_members?.clans || null} />
                                  <span>•</span>
                                  <span>{format(new Date(post.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                                </div>
                              </CardHeader>
                              <CardFooter className="flex justify-center mt-auto">
                                <Link to={`/news/${post.id}`} className="text-primary hover:underline">
                                  Ler Mais
                                </Link>
                              </CardFooter>
                            </Card>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-lg">
            <Newspaper className="mx-auto h-12 w-12 mb-4" />
            <p>Nenhuma notícia publicada ainda.</p>
          </div>
        )}
      </div>
    </section>
  );
};
