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

interface DeckCommentSectionProps {
  deckId: number;
  user: User | null;
  deckOwnerId: string;
  deckName: string;
}

const fetchComments = async (deckId) => {

  const { data, error } = await supabase.rpc('get_deck_comments', { p_deck_id: deckId });



  if (error) throw error;

  return data || [];

};

export const DeckCommentSection = ({ deckId, user, deckOwnerId, deckName }: DeckCommentSectionProps) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const { profile } = useProfile(user?.id);
  const queryKey = ['deckComments', deckId];

  const { data: flatComments, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchComments(deckId)
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
      const { data: commentData, error } = await supabase.from('deck_comments').insert({ deck_id: deckId, user_id: user.id, comment_text: commentText, parent_comment_id: null }).select().single();
      if (error) throw error;
      return commentData;
    },
    onSuccess: (commentData) => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey });

      // Create notification
      if (user && user.id !== deckOwnerId) {
        supabase.rpc('create_notification', {
            p_recipient_id: deckOwnerId,
            p_type: 'new_deck_comment',
            p_data: {
                deck_name: deckName,
                comment_text: newComment,
            },
            p_link: `/deck/${deckId}#comment-${commentData.id}`
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
                contentId={deckId}
                user={user}
                queryKey={queryKey}
                commentTable="deck_comments"
                likeTable="deck_comment_likes"
                contentColumn="deck_id"
            />
          ))}
          {commentsTree.length === 0 && <p className="text-muted-foreground text-center">Seja o primeiro a comentar!</p>}
        </div>
      )}
    </div>
  );
};
