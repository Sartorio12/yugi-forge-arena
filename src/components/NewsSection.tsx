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
          content,
          created_at,
          banner_url,
          profiles ( username, avatar_url, clans(tag) )
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as NewsPost[];
    },
  });

  const truncateText = (text: string, length: number) => {
    if (!text) return "";
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  };

  return (
    <section className="py-16 md:py-24">
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
              <Card key={post.id} className="h-full flex flex-col bg-gradient-card border-border">
                {post.banner_url && (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                    <img src={post.banner_url} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-xl font-bold">{post.title}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback>{post.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <UserDisplay profile={post.profiles} clan={post.profiles.clans && post.profiles.clans.length > 0 ? post.profiles.clans[0] : null} />
                    <span>•</span>
                    <span>{format(new Date(post.created_at), "dd/MM/yy", { locale: ptBR })}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground">
                    {truncateText(post.content?.replace(/<[^>]+>/g, '') || "", 120)}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between mt-auto">
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
