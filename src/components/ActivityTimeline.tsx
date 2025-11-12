import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, ShieldPlus, Trophy, BookOpen, MessageSquare, Heart, LayoutList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Activity {
  id: string;
  type: "user_registration" | "clan_creation" | "tournament_registration" | "public_deck" | "news_post" | "deck_comment" | "news_comment" | "deck_like";
  message: string;
  timestamp: string;
  link?: string; // Optional link to the related item
}

export const ActivityTimeline = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitialActivities = async () => {
      setIsLoading(true);
      try {
        const allActivities: Activity[] = [];

        // Fetch recent user registrations
        const { data: users, error: userError } = await supabase
          .from("profiles")
          .select("id, username, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);
        if (userError) console.error("Error fetching users:", userError);
        (users || []).forEach((user) =>
          allActivities.push({
            id: `user-${user.id}`,
            type: "user_registration",
            message: `Novo usuário: ${user.username}`,
            timestamp: user.updated_at,
            link: `/profile/${user.id}`,
          })
        );

        // Fetch recent clan creations
        const { data: clans, error: clanError } = await supabase
          .from("clans")
          .select("id, name, tag, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        if (clanError) console.error("Error fetching clans:", clanError);
        (clans || []).forEach((clan) =>
          allActivities.push({
            id: `clan-${clan.id}`,
            type: "clan_creation",
            message: `Novo clã: ${clan.name} [${clan.tag}]`,
            timestamp: clan.created_at,
            link: `/clans/${clan.id}`,
          })
        );

        // Fetch recent tournament registrations
        const { data: tournamentParticipants, error: tpError } = await supabase
          .from("tournament_participants")
          .select("id, created_at, profiles(username), tournaments(title)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (tpError) console.error("Error fetching tournament participants:", tpError);
        (tournamentParticipants || []).forEach((tp) =>
          allActivities.push({
            id: `tp-${tp.id}`,
            type: "tournament_registration",
            message: `${tp.profiles?.username} se inscreveu no torneio: ${tp.tournaments?.title}`,
            timestamp: tp.created_at,
            link: `/tournaments/${tp.tournaments?.id}`,
          })
        );

        // Fetch recent public decks
        const { data: publicDecks, error: deckError } = await supabase
          .from("decks")
          .select("id, deck_name, created_at, profiles(username)")
          .eq("is_private", false)
          .order("created_at", { ascending: false })
          .limit(5);
        if (deckError) console.error("Error fetching public decks:", deckError);
        (publicDecks || []).forEach((deck) =>
          allActivities.push({
            id: `deck-${deck.id}`,
            type: "public_deck",
            message: `Novo deck público: "${deck.deck_name}" por ${deck.profiles?.username}`,
            timestamp: deck.created_at,
            link: `/deck/${deck.id}`,
          })
        );

        // Fetch recent news posts
        const { data: newsPosts, error: newsError } = await supabase
          .from("news_posts")
          .select("id, title, created_at, profiles(username)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (newsError) console.error("Error fetching news posts:", newsError);
        (newsPosts || []).forEach((post) =>
          allActivities.push({
            id: `news-${post.id}`,
            type: "news_post",
            message: `Nova notícia: "${post.title}" por ${post.profiles?.username}`,
            timestamp: post.created_at,
            link: `/news/${post.id}`,
          })
        );

        // Fetch recent deck comments
        const { data: deckComments, error: dcError } = await supabase
          .from("deck_comments")
          .select("id, comment_text, created_at, profiles(username), decks(deck_name)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (dcError) console.error("Error fetching deck comments:", dcError);
        (deckComments || []).forEach((comment) =>
          allActivities.push({
            id: `dcomment-${comment.id}`,
            type: "deck_comment",
            message: `${comment.profiles?.username} comentou no deck "${comment.decks?.deck_name}"`,
            timestamp: comment.created_at,
            link: `/deck/${comment.decks?.id}`,
          })
        );

        // Fetch recent news comments
        const { data: newsComments, error: ncError } = await supabase
          .from("news_comments")
          .select("id, comment_text, created_at, profiles(username), news_posts(title)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (ncError) console.error("Error fetching news comments:", ncError);
        (newsComments || []).forEach((comment) =>
          allActivities.push({
            id: `ncomment-${comment.id}`,
            type: "news_comment",
            message: `${comment.profiles?.username} comentou na notícia "${comment.news_posts?.title}"`,
            timestamp: comment.created_at,
            link: `/news/${comment.news_posts?.id}`,
          })
        );

        // Fetch recent deck likes
        const { data: deckLikes, error: dlError } = await supabase
          .from("deck_likes")
          .select("id, created_at, profiles(username), decks(deck_name)")
          .order("created_at", { ascending: false })
          .limit(5);
        if (dlError) console.error("Error fetching deck likes:", dlError);
        (deckLikes || []).forEach((like) =>
          allActivities.push({
            id: `dlike-${like.id}`,
            type: "deck_like",
            message: `${like.profiles?.username} curtiu o deck "${like.decks?.deck_name}"`,
            timestamp: like.created_at,
            link: `/deck/${like.decks?.id}`,
          })
        );

        const combinedActivities = allActivities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10); // Show up to 10 initial activities

        setActivities(combinedActivities);
      } catch (error) {
        console.error("Error fetching initial activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialActivities();

    // Set up Realtime subscriptions
    const userSubscription = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const newUser = payload.new as { id: string; username: string; created_at: string };
          setActivities((prev) =>
            [
              {
                id: `user-${newUser.id}`,
                type: "user_registration",
                message: `Novo usuário: ${newUser.username}`,
                timestamp: newUser.created_at,
                link: `/profile/${newUser.id}`,
              },
              ...prev,
            ].slice(0, 10) // Keep the list to a reasonable size
          );
        }
      )
      .subscribe();

    const clanSubscription = supabase
      .channel("public:clans")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "clans" },
        (payload) => {
          const newClan = payload.new as { id: number; name: string; tag: string; created_at: string };
          setActivities((prev) =>
            [
              {
                id: `clan-${newClan.id}`,
                type: "clan_creation",
                message: `Novo clã: ${newClan.name} [${newClan.tag}]`,
                timestamp: newClan.created_at,
                link: `/clans/${newClan.id}`,
              },
              ...prev,
            ].slice(0, 10) // Keep the list to a reasonable size
          );
        }
      )
      .subscribe();

    const tournamentRegistrationSubscription = supabase
      .channel("public:tournament_participants")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tournament_participants" },
        async (payload) => {
          const newTp = payload.new as { id: number; user_id: string; tournament_id: number; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newTp.user_id).single();
          const { data: tournamentData } = await supabase.from('tournaments').select('title').eq('id', newTp.tournament_id).single();

          if (profileData && tournamentData) {
            setActivities((prev) =>
              [
                {
                  id: `tp-${newTp.id}`,
                  type: "tournament_registration",
                  message: `${profileData.username} se inscreveu no torneio: ${tournamentData.title}`,
                  timestamp: newTp.created_at,
                  link: `/tournaments/${newTp.tournament_id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    const publicDeckSubscription = supabase
      .channel("public:decks")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "decks", filter: "is_private=eq.false" },
        async (payload) => {
          const newDeck = payload.new as { id: number; deck_name: string; user_id: string; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newDeck.user_id).single();

          if (profileData) {
            setActivities((prev) =>
              [
                {
                  id: `deck-${newDeck.id}`,
                  type: "public_deck",
                  message: `Novo deck público: "${newDeck.deck_name}" por ${profileData.username}`,
                  timestamp: newDeck.created_at,
                  link: `/deck/${newDeck.id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    const newsPostSubscription = supabase
      .channel("public:news_posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_posts" },
        async (payload) => {
          const newPost = payload.new as { id: number; title: string; author_id: string; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newPost.author_id).single();

          if (profileData) {
            setActivities((prev) =>
              [
                {
                  id: `news-${newPost.id}`,
                  type: "news_post",
                  message: `Nova notícia: "${newPost.title}" por ${profileData.username}`,
                  timestamp: newPost.created_at,
                  link: `/news/${newPost.id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    const deckCommentSubscription = supabase
      .channel("public:deck_comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deck_comments" },
        async (payload) => {
          const newComment = payload.new as { id: number; user_id: string; deck_id: number; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newComment.user_id).single();
          const { data: deckData } = await supabase.from('decks').select('deck_name').eq('id', newComment.deck_id).single();

          if (profileData && deckData) {
            setActivities((prev) =>
              [
                {
                  id: `dcomment-${newComment.id}`,
                  type: "deck_comment",
                  message: `${profileData.username} comentou no deck "${deckData.deck_name}"`,
                  timestamp: newComment.created_at,
                  link: `/deck/${newComment.deck_id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    const newsCommentSubscription = supabase
      .channel("public:news_comments")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "news_comments" },
        async (payload) => {
          const newComment = payload.new as { id: number; user_id: string; post_id: number; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newComment.user_id).single();
          const { data: newsData } = await supabase.from('news_posts').select('title').eq('id', newComment.post_id).single();

          if (profileData && newsData) {
            setActivities((prev) =>
              [
                {
                  id: `ncomment-${newComment.id}`,
                  type: "news_comment",
                  message: `${profileData.username} comentou na notícia "${newsData.title}"`,
                  timestamp: newComment.created_at,
                  link: `/news/${newComment.post_id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    const deckLikeSubscription = supabase
      .channel("public:deck_likes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deck_likes" },
        async (payload) => {
          const newLike = payload.new as { id: number; user_id: string; deck_id: number; created_at: string };
          const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newLike.user_id).single();
          const { data: deckData } = await supabase.from('decks').select('deck_name').eq('id', newLike.deck_id).single();

          if (profileData && deckData) {
            setActivities((prev) =>
              [
                {
                  id: `dlike-${newLike.id}`,
                  type: "deck_like",
                  message: `${profileData.username} curtiu o deck "${deckData.deck_name}"`,
                  timestamp: newLike.created_at,
                  link: `/deck/${newLike.deck_id}`,
                },
                ...prev,
              ].slice(0, 10)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userSubscription);
      supabase.removeChannel(clanSubscription);
      supabase.removeChannel(tournamentRegistrationSubscription);
      supabase.removeChannel(publicDeckSubscription);
      supabase.removeChannel(newsPostSubscription);
      supabase.removeChannel(deckCommentSubscription);
      supabase.removeChannel(newsCommentSubscription);
      supabase.removeChannel(deckLikeSubscription);
    };
  }, []);

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-64">
            <ul className="space-y-4">
              {activities.map((activity) => (
                <li key={activity.id} className="flex items-start space-x-3">
                  {activity.type === "user_registration" && (
                    <UserPlus className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {activity.type === "clan_creation" && (
                    <ShieldPlus className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}
                  {activity.type === "tournament_registration" && (
                    <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  )}
                  {activity.type === "public_deck" && (
                    <LayoutList className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  )}
                  {activity.type === "news_post" && (
                    <BookOpen className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  {(activity.type === "deck_comment" || activity.type === "news_comment") && (
                    <MessageSquare className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                  )}
                  {activity.type === "deck_like" && (
                    <Heart className="h-5 w-5 text-pink-500 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
