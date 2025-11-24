
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from 'dompurify';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { NewsLikeButton } from '@/components/likes/NewsLikeButton';
import { NewsCommentSection } from '@/components/comments/NewsCommentSection';
import UserDisplay from "@/components/UserDisplay";

interface NewsPostPageProps {
  user: User | null;
  onLogout: () => void;
}

const fetchNewsPost = async (postId) => {
  const { data, error } = await supabase.from("news_posts").select(`id, title, content, created_at, author_id, profiles (id, username, avatar_url)`).eq("id", postId).single();
  if (error) throw error;
  return data;
};

const NewsPostPage = ({ user, onLogout }: NewsPostPageProps) => {
  const { id } = useParams<{ id: string }>();
  const { data: post, isLoading, isError } = useQuery({ queryKey: ["newsPost", id], queryFn: () => fetchNewsPost(id) });

  const { data: authorClan } = useQuery({
    queryKey: ["user-clan", post?.author_id],
    queryFn: async () => {
      if (!post?.author_id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", post.author_id)
        .single();
      return data?.clans;
    },
    enabled: !!post?.author_id,
  });

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (isError || !post) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Post não encontrado.</p></div>;

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <div className="container mx-auto max-w-3xl py-12">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-secondary-foreground">
              {post.profiles && (
                <>
                  <Avatar className="h-8 w-8"><AvatarImage src={post.profiles.avatar_url} /><AvatarFallback>{post.profiles.username?.substring(0, 2)}</AvatarFallback></Avatar>
                  <span>
                    <UserDisplay profile={post.profiles} clan={authorClan} />
                  </span>
                  <span>•</span>
                </>
              )}
              <span>{format(new Date(post.created_at), "dd/MM/yyyy")}</span>
            </div>
            <NewsLikeButton postId={post.id} user={user} postAuthorId={post.author_id} postTitle={post.title} />
          </div>
        </header>
        <div className="prose dark:prose-invert max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || "") }} />
        {post && <NewsCommentSection postId={post.id} user={user} postAuthorId={post.author_id} postTitle={post.title} />}
      </div>
    </div>
  );
};

export default NewsPostPage;
