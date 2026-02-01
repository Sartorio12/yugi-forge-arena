
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from "react-i18next";

interface NewsListPageProps {
  user: User | null;
  onLogout: () => void;
}

const fetchNewsPosts = async () => {
  const { data, error } = await supabase.from('news_posts').select(`id, title, created_at, profiles ( username )`).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

const NewsListPage = ({ user, onLogout }: NewsListPageProps) => {
  const { t, i18n } = useTranslation();
  const { data: posts, isLoading, isError } = useQuery({ queryKey: ['newsPosts'], queryFn: fetchNewsPosts });

  const localeMap: { [key: string]: any } = {
    pt: ptBR,
    en: enUS,
    es: es,
  };
  const currentLocale = localeMap[i18n.language] || ptBR;

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !posts) return <div className="min-h-screen bg-background flex items-center justify-center"><p>{t('news_list_page.error')}</p></div>;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <div className="container mx-auto max-w-4xl py-12">
                  <h1 className="text-4xl font-bold mb-8 text-center">{t('news_list_page.title')}</h1>        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Link to={`/news/${post.id}`} key={post.id}>
              <Card className="h-full flex flex-col hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-secondary-foreground">
                    {t('news_list_page.by_author_on_date', { 
                        author: post.profiles?.username || t('news_list_page.anonymous'), 
                        date: format(new Date(post.created_at), 'dd/MM/yyyy', { locale: currentLocale }) 
                    })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {posts.length === 0 && <p className="col-span-full text-center text-secondary-foreground">{t('news_list_page.no_news')}</p>}
        </div>
      </div>
    </div>
  );
};

export default NewsListPage;
