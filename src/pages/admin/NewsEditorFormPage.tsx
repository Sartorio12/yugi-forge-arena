
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { NewsForm } from '@/components/forms/NewsForm';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

const fetchPost = async (postId) => {
  if (!postId) return null;
  const { data, error } = await supabase.from('news_posts').select('*').eq('id', postId).single();
  if (error) throw error;
  return data;
};

const NewsEditorFormPage = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile(user?.id);
  const isEditMode = !!id;

  const { data: initialData, isLoading: isLoadingPost } = useQuery({
    queryKey: ['newsPost', id],
    queryFn: () => fetchPost(id),
    enabled: isEditMode,
  });

  const mutation = useMutation({
    mutationFn: async (postData) => {
      if (!profile) throw new Error('Perfil não encontrado.');

      let banner_url = initialData?.banner_url || null;

      if (postData.banner) {
        const file = postData.banner;
        const filePath = `public/news-banners/${profile.id}/${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('news_content')
          .upload(filePath, file);

        if (uploadError) {
          throw new Error(`Falha no upload do banner: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from('news_content').getPublicUrl(filePath);
        banner_url = urlData.publicUrl;
      }

      const { banner, ...restOfPostData } = postData;

      const dataToSave = {
        ...restOfPostData,
        author_id: profile.id,
        banner_url: banner_url,
      };

      const { error } = isEditMode
        ? await supabase.from('news_posts').update(dataToSave).eq('id', id)
        : await supabase.from('news_posts').insert(dataToSave);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: `Postagem ${isEditMode ? 'atualizada' : 'criada'} com sucesso!` });
      queryClient.invalidateQueries({ queryKey: ['newsPostsAdmin'] });
      navigate('/dashboard/news');
    },
    onError: (error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoadingPost) return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader><CardTitle>{isEditMode ? 'Editar Postagem' : 'Criar Nova Postagem'}</CardTitle></CardHeader>
        <CardContent>
          <NewsForm
            formId="news-form"
            initialData={initialData}
            onSubmit={(data) => mutation.mutate(data)}
          />
          <div className="flex justify-end mt-8 space-x-2">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/news')}>
              Cancelar
            </Button>
            <Button type="submit" form="news-form" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Salvar Alterações' : 'Publicar Postagem'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewsEditorFormPage;
