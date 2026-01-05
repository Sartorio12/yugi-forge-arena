import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User } from '@supabase/supabase-js';
import { FramedAvatar } from "../FramedAvatar";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Comment, CommentType } from './Comment';

interface NewsCommentSectionProps {
  postId: number;
  user: User | null;
  postAuthorId: string;
  postTitle: string;
}

const fetchComments = async (postId) => {
  const { data, error } = await supabase.rpc('get_news_comments', { p_post_id: postId });

  if (error) throw error;
  return data || [];
};

export const NewsCommentSection = ({ postId, user, postAuthorId, postTitle }: NewsCommentSectionProps) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const { profile } = useProfile(user?.id);
  const queryKey = ['newsComments', postId];

  const { data: flatComments, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchComments(postId)
  });

  const commentsTree = useMemo(() => {
    if (!flatComments) return [];
    const commentsById: { [key: number]: CommentType & { replies: CommentType[] } } = {};
    const tree: (CommentType & { replies: CommentType[] })[] = [];

    flatComments.forEach(comment => {
        commentsById[comment.id] = { ...comment, replies: [] };
    });

    flatComments.forEach(comment => {
        if (comment.parent_comment_id && commentsById[comment.parent_comment_id]) {
            commentsById[comment.parent_comment_id].replies.push(commentsById[comment.id]);
        } else {
            tree.push(commentsById[comment.id]);
        }
    });

    return tree.reverse();
  }, [flatComments]);

  const addCommentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) throw new Error('Você precisa estar logado para comentar.');
      const { data: commentData, error } = await supabase.from('news_comments').insert({ post_id: postId, user_id: user.id, comment_text: commentText, parent_comment_id: null }).select().single();
      if (error) throw error;
      return commentData;
    },
    onSuccess: (commentData) => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey });

      // Create notification
      if (user && user.id !== postAuthorId) {
        supabase.rpc('create_notification', {
            p_recipient_id: postAuthorId,
            p_type: 'new_news_comment',
            p_data: {
                post_title: postTitle,
                comment_text: newComment,
            },
            p_link: `/news/${postId}#comment-${commentData.id}`
        }).then(({ error }) => {
            if (error) {
                console.error('Error creating notification:', error);
            }
        });
      }
    },
  });

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">Comentários</h2>
      {user && (
        <Card className="mb-8"><CardContent className="p-4"><div className="flex gap-4">
          <FramedAvatar 
            userId={profile?.id} 
            avatarUrl={profile?.avatar_url} 
            username={profile?.username}
            sizeClassName="h-10 w-10"
            showFrame={true}
          />
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
          {commentsTree.map(comment => (
            <Comment
                key={comment.id}
                comment={comment}
                contentId={postId}
                user={user}
                queryKey={queryKey}
                commentTable="news_comments"
                likeTable="news_comment_likes"
                contentColumn="post_id"
            />
          ))}
          {commentsTree.length === 0 && <p className="text-muted-foreground text-center">Seja o primeiro a comentar!</p>}
        </div>
      )}
    </div>
  );
};