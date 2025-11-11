import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User } from '@supabase/supabase-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserDisplay from '../UserDisplay';

interface NewsCommentSectionProps {
  postId: number;
  user: User | null;
}

const fetchComments = async (postId) => {
  const { data, error } = await supabase.from('news_comments').select(`id, comment_text, created_at, profiles ( id, username, avatar_url, clans(tag) )`).eq('post_id', postId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const NewsCommentSection = ({ postId, user }: NewsCommentSectionProps) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const { profile } = useProfile(user?.id);
  const { data: comments, isLoading } = useQuery({ queryKey: ['newsComments', postId], queryFn: () => fetchComments(postId) });

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) throw new Error('Você precisa estar logado para comentar.');
      const { error } = await supabase.from('news_comments').insert({ post_id: postId, user_id: user.id, comment_text: commentText });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['newsComments', postId] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const { error } = await supabase.from('news_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['newsComments', postId] }); },
  });

  const canDelete = (commentAuthorId: string) => {
    if (!user || !profile) return false;
    if (profile.role === 'admin' || profile.role === 'organizer') return true;
    return user.id === commentAuthorId;
  };

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Comentários</h2>
      {user && (
        <Card className="mb-8"><CardContent className="p-4"><div className="flex gap-4">
          <Avatar><AvatarImage src={profile?.avatar_url} /><AvatarFallback>{profile?.username?.substring(0, 2)}</AvatarFallback></Avatar>
          <div className="w-full">
            <Textarea placeholder="Escreva seu comentário..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="mb-2" />
            <Button onClick={() => addCommentMutation.mutate(newComment)} disabled={!newComment.trim() || addCommentMutation.isPending}>
              {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Postar Comentário
            </Button>
          </div>
        </div></CardContent></Card>
      )}
      {isLoading ? (
        <div className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : (
        <div className="space-y-6">
          {comments?.map(comment => (
            <div key={comment.id} className="flex gap-4">
              {comment.profiles ? (
                <Link to={`/profile/${comment.profiles.id}`}>
                  <Avatar>
                    <AvatarImage src={comment.profiles.avatar_url} />
                    <AvatarFallback>{comment.profiles.username?.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                </Link>
              ) : (
                <Avatar>
                  <AvatarFallback>A</AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    {comment.profiles ? (
                      <Link to={`/profile/${comment.profiles.id}`}>
                        <span className="font-semibold hover:underline">
                          <UserDisplay profile={{ ...comment.profiles, clan: comment.profiles.clans }} />
                        </span>
                      </Link>
                    ) : (
                      <span className="font-semibold">{'Anônimo'}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
                  </div>
                  {canDelete(comment.profiles?.id) && (
                    <Button variant="ghost" size="icon" onClick={() => deleteCommentMutation.mutate(comment.id)} disabled={deleteCommentMutation.isPending}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                  )}
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap">{comment.comment_text}</p>
              </div>
            </div>
          ))}
          {comments?.length === 0 && <p className="text-muted-foreground text-center">Seja o primeiro a comentar!</p>}
        </div>
      )}
    </div>
  );
};