
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

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
  const { data: posts, isLoading, isError } = useQuery({ queryKey: ['newsPosts'], queryFn: fetchNewsPosts });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !posts) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Erro ao carregar notícias.</p></div>;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <div className="container mx-auto max-w-4xl py-12">
        <h1 className="text-4xl font-bold mb-8">Últimas Notícias</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(post => (
            <Link to={`/news/${post.id}`} key={post.id}>
              <Card className="h-full flex flex-col hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-secondary-foreground">Por {post.profiles?.username || 'Anônimo'} em {format(new Date(post.created_at), 'dd/MM/yyyy')}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          {posts.length === 0 && <p className="col-span-full text-center text-secondary-foreground">Nenhuma notícia encontrada.</p>}
        </div>
      </div>
    </div>
  );
};

export default NewsListPage;
