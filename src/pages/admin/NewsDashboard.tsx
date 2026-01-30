
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, FilePenLine, BarChart } from 'lucide-react';
import { format } from 'date-fns';
import { PollManagerModal } from '@/components/admin/PollManagerModal';
import { useState } from 'react';

const fetchNews = async () => {
  const { data, error } = await supabase.from('news_posts').select('id, title, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

const NewsDashboard = () => {
  const queryClient = useQueryClient();
  const { data: posts, isLoading } = useQuery({ queryKey: ['newsPostsAdmin'], queryFn: fetchNews });
  
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<{id: number, title: string} | null>(null);

  const handleOpenPollManager = (post: { id: number, title: string }) => {
    setSelectedNews(post);
    setPollModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (postId) => {
      const { error } = await supabase.from('news_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['newsPostsAdmin'] }); },
  });

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciador de Notícias</h1>
        <Link to="/dashboard/news/create">
          <Button><PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Postagem</Button>
        </Link>
      </div>
      
      <PollManagerModal 
        open={pollModalOpen} 
        onOpenChange={setPollModalOpen}
        newsPostId={selectedNews?.id || null}
        newsTitle={selectedNews?.title}
      />

      <Card>
        <CardHeader><CardTitle>Postagens Publicadas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Título</TableHead><TableHead>Data de Criação</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {posts?.map(post => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">{post.title}</TableCell>
                      <TableCell>{format(new Date(post.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => handleOpenPollManager({ id: post.id, title: post.title })}
                            title="Gerenciar Enquete"
                        >
                            <BarChart className="h-4 w-4" />
                        </Button>
                        <Link to={`/dashboard/news/${post.id}/edit`}><Button variant="ghost" size="icon"><FilePenLine className="h-4 w-4" /></Button></Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita. Isso irá deletar permanentemente a postagem.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(post.id)} disabled={deleteMutation.isPending}>Deletar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NewsDashboard;
