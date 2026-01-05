import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { User } from '@supabase/supabase-js';
import { FramedAvatar } from "../FramedAvatar";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2, Heart, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import UserDisplay from '../UserDisplay';

// Types
type Profile = {
    id: string;
    username: string;
    avatar_url: string;
};

type Clan = {
    tag: string;
};

export type CommentType = {
    id: number;
    comment_text: string;
    created_at: string;
    parent_comment_id: number | null;
    profiles: Profile & { clans: Clan | null };
    likes: Like[];
    replies: CommentType[];
};

interface CommentProps {
    comment: CommentType;
    contentId: number; // postId or deckId
    user: User | null;
    isReply?: boolean;
    queryKey: (string | number)[];
    commentTable: 'news_comments' | 'deck_comments';
    likeTable: 'news_comment_likes' | 'deck_comment_likes';
    contentColumn: 'post_id' | 'deck_id';
}

export const Comment = ({ comment, contentId, user, isReply = false, queryKey, commentTable, likeTable, contentColumn }: CommentProps) => {
    const queryClient = useQueryClient();
    const { profile } = useProfile(user?.id);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');

    const addCommentMutation = useMutation({
        mutationFn: async ({ commentText, parentId }: { commentText: string, parentId: number | null }) => {
            if (!user) throw new Error('Você precisa estar logado para comentar.');
            const { data: commentData, error } = await supabase.from(commentTable).insert({ [contentColumn]: contentId, user_id: user.id, comment_text: commentText, parent_comment_id: parentId }).select().single();
            if (error) throw error;
            return commentData;
        },
        onSuccess: (commentData, variables) => {
            setReplyText('');
            setIsReplying(false);
            queryClient.invalidateQueries({ queryKey });

            // Notify on reply
            if (user && variables.parentId && comment.profiles.id !== user.id) {
                supabase.rpc('create_notification', {
                    p_recipient_id: comment.profiles.id,
                    p_type: 'new_comment_reply',
                    p_data: { comment_text: variables.commentText },
                    p_link: `/${commentTable === 'deck_comments' ? 'deck' : 'news'}/${contentId}#comment-${commentData.id}`
                }).then(({ error }) => {
                    if (error) {
                        console.error('Error creating notification:', error);
                    }
                });
            }
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: number) => {
            const { error } = await supabase.from(commentTable).delete().eq('id', commentId);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey }); },
    });

    const likeMutation = useMutation({
        mutationFn: async ({ commentId, liked }: { commentId: number, liked: boolean }) => {
            if (!user) throw new Error('Você precisa estar logado para curtir.');
            if (liked) {
                const { error } = await supabase.from(likeTable).delete().match({ comment_id: commentId, user_id: user.id });
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from(likeTable).insert({ comment_id: commentId, user_id: user.id }).select().single();
                if (error) {
                    // This handles the race condition where user clicks quickly
                    if (error.code === '23505') { // 23505 is unique_violation
                        console.warn('Like already exists, likely a race condition.');
                    } else {
                        throw error;
                    }
                }
            }
            return { commentId, liked };
        },
        onSuccess: ({ commentId, liked }) => {
            queryClient.setQueryData(queryKey, (oldData: CommentType[] | undefined) => {
                if (!oldData) return oldData;
                return oldData.map(c => {
                    if (c.id === commentId) {
                        const newLikes = c.likes ? [...c.likes] : [];
                        if (liked) { // it was liked, now it's unliked
                            const index = newLikes.findIndex(l => l.user_id === user?.id);
                            if (index > -1) newLikes.splice(index, 1);
                        } else { // it was not liked, now it is
                            const alreadyLiked = newLikes.some(l => l.user_id === user?.id);
                            if (!alreadyLiked) {
                                newLikes.push({ user_id: user!.id });
                            }
                        }
                        return { ...c, likes: newLikes };
                    }
                    return c;
                });
            });

            // Notify on like
            if (user && !liked && comment.profiles.id !== user.id) {
                supabase.rpc('create_notification', {
                    p_recipient_id: comment.profiles.id,
                    p_type: 'new_comment_like',
                    p_data: { comment_text: comment.comment_text },
                    p_link: `/${commentTable === 'deck_comments' ? 'deck' : 'news'}/${contentId}#comment-${comment.id}`
                }).then(({ error }) => {
                    if (error) {
                        console.error('Error creating notification:', error);
                    }
                });
            }
        }
    });

    const canDelete = (commentAuthorId: string) => {
        if (!user || !profile) return false;
        if (profile.role === 'admin' || profile.role === 'organizer') return true;
        return user.id === commentAuthorId;
    };

    const userHasLiked = (comment.likes || []).some(like => like.user_id === user?.id);

    return (
        <div className={`flex gap-4 ${isReply ? 'mt-4' : ''}`}>
            {comment.profiles ? (
                <Link to={`/profile/${comment.profiles.id}`}>
                    <FramedAvatar
                        userId={comment.profiles.id}
                        avatarUrl={comment.profiles.avatar_url}
                        username={comment.profiles.username}
                        sizeClassName={isReply ? "h-8 w-8" : "h-10 w-10"}
                        showFrame={true}
                    />
                </Link>
            ) : (
                <FramedAvatar
                    sizeClassName={isReply ? "h-8 w-8" : "h-10 w-10"}
                    showFrame={true}
                />
            )}
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    <div>
                        {comment.profiles ? (
                            <Link to={`/profile/${comment.profiles.id}`}>
                                <span className="font-semibold hover:underline">
                                    <UserDisplay profile={comment.profiles} clan={comment.profiles.clans} />
                                </span>
                            </Link>
                        ) : (
                            <span className="font-semibold">{'Anônimo'}</span>
                        )}
                        <span className="text-xs text-muted-foreground ml-2">
  {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR }) : 'agora mesmo'}
</span>
                    </div>
                    {canDelete(comment.profiles?.id) && (
                        <Button variant="ghost" size="icon" onClick={() => deleteCommentMutation.mutate(comment.id)} disabled={deleteCommentMutation.isPending}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    )}
                </div>
                <p className="text-foreground/90 whitespace-pre-wrap mt-1">{comment.comment_text}</p>
                <div className="flex items-center gap-4 mt-2">
                    <Button variant="ghost" size="sm" onClick={() => likeMutation.mutate({ commentId: comment.id, liked: userHasLiked })} disabled={likeMutation.isPending || !user}>
                        <Heart className={`mr-2 h-4 w-4 ${userHasLiked ? 'text-red-500 fill-red-500' : ''}`} />
                        {comment.likes?.length || 0}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)} disabled={!user}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Responder
                    </Button>
                </div>

                {isReplying && (
                    <div className="flex gap-4 mt-4">
                        <FramedAvatar
                            userId={profile?.id}
                            avatarUrl={profile?.avatar_url}
                            username={profile?.username}
                            sizeClassName="h-8 w-8"
                            showFrame={true}
                        />
                        <div className="w-full">
                            <Textarea placeholder={`Respondendo a ${comment.profiles.username}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} className="mb-2" />
                            <Button onClick={() => addCommentMutation.mutate({ commentText: replyText, parentId: comment.id })} disabled={!replyText.trim() || addCommentMutation.isPending}>
                                {addCommentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Postar Resposta
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mt-4 pl-6 border-l-2 border-muted">
                    {comment.replies?.map(reply => (
                        <Comment
                            key={reply.id}
                            comment={reply}
                            contentId={contentId}
                            user={user}
                            isReply={true}
                            queryKey={queryKey}
                            commentTable={commentTable}
                            likeTable={likeTable}
                            contentColumn={contentColumn}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
