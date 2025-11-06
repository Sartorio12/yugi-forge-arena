import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsLikeButtonProps {
  postId: number;
  user: User | null;
}

const fetchLikes = async (postId, userId) => {
  const { data: likes, error: likesError } = await supabase.from('news_likes').select('user_id').eq('post_id', postId);
  if (likesError) throw likesError;
  const userHasLiked = userId ? likes.some(like => like.user_id === userId) : false;
  return { likeCount: likes.length, userHasLiked };
};

export const NewsLikeButton = ({ postId, user }: NewsLikeButtonProps) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['newsLikes', postId, user?.id], queryFn: () => fetchLikes(postId, user?.id) });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado.');
      const { error } = await supabase.from('news_likes').insert({ post_id: postId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['newsLikes', postId] }); },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado.');
      const { error } = await supabase.from('news_likes').delete().match({ post_id: postId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['newsLikes', postId] }); },
  });

  const handleLike = () => {
    if (!user) return;
    if (data?.userHasLiked) { unlikeMutation.mutate(); } else { likeMutation.mutate(); }
  };

  return (
    <Button variant="outline" onClick={handleLike} disabled={likeMutation.isPending || unlikeMutation.isPending || isLoading}>
      <Heart className={cn("mr-2 h-4 w-4", data?.userHasLiked && "fill-red-500 text-red-500")} />
      {data?.likeCount ?? 0}
    </Button>
  );
};