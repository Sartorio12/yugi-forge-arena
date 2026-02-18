import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { User } from '@supabase/supabase-js';
import { Loader2, Calendar, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from "react-i18next";
import { getOptimizedStorageUrl } from "@/lib/utils-img";

interface NewsListPageProps {
  user: User | null;
  onLogout: () => void;
}

const fetchNewsPosts = async () => {
  const { data, error } = await supabase
    .from('news_posts')
    .select(`id, title, banner_url, created_at, profiles ( username )`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

const NewsListPage = ({ user, onLogout }: NewsListPageProps) => {
  const { t, i18n } = useTranslation();
  const { data: posts, isLoading, isError } = useQuery({ queryKey: ['newsPosts', 'list'], queryFn: fetchNewsPosts });

  const localeMap: { [key: string]: any } = {
    pt: ptBR,
    en: enUS,
    es: es,
  };
  const currentLocale = localeMap[i18n.language] || ptBR;

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (isError || !posts) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
      <div>
        <p className="text-xl font-bold text-destructive mb-2">{t('news_list_page.error')}</p>
        <p className="text-muted-foreground text-sm">Verifique sua conexão e tente novamente.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <div className="container mx-auto max-w-6xl py-12 px-4">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black uppercase tracking-tighter italic mb-4 drop-shadow-2xl">
            Arena <span className="text-primary">News</span>
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-[0.3em]">Fique por dentro das últimas atualizações</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Link to={`/news/${post.id}`} key={post.id} className="group h-full">
              <Card className="h-full flex flex-col border-white/5 bg-zinc-900/50 hover:bg-zinc-900 hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-2xl">
                <div className="relative aspect-video overflow-hidden">
                  {post.banner_url ? (
                    <img 
                      src={getOptimizedStorageUrl(post.banner_url, { width: 600, quality: 80 }) || ""} 
                      alt={post.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                      <Swords className="h-12 w-12 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                </div>

                <CardHeader className="space-y-2 pt-6">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/80">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(post.created_at), 'dd MMM yyyy', { locale: currentLocale })}
                  </div>
                  <CardTitle className="text-xl font-black uppercase tracking-tight italic leading-none group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="mt-auto pt-0 pb-6">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                    <UserIcon className="h-3 w-3" />
                    <span className="truncate">
                      {post.profiles?.username || t('news_list_page.anonymous')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-white/10">
            <p className="text-muted-foreground text-sm uppercase tracking-widest">{t('news_list_page.no_news')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsListPage;
