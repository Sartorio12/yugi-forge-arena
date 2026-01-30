import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, ShieldPlus, Trophy, BookOpen, MessageSquare, Heart, LayoutList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface Activity {
  id: string;
  type: "user_registration" | "clan_creation" | "tournament_registration" | "public_deck" | "news_post" | "deck_comment" | "news_comment" | "deck_like";
  timestamp: string;
  link?: string;
  data: any; // Dynamic data for translations
}

export const ActivityTimeline = () => {
  const { t, i18n } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const localeMap: { [key: string]: any } = {
    pt: ptBR,
    en: enUS,
    es: es,
  };
  const currentLocale = localeMap[i18n.language] || ptBR;

  useEffect(() => {
    const fetchInitialActivities = async () => {
      setIsLoading(true);
      try {
        const allActivities: Activity[] = [];

        // Fetch recent user registrations
        const { data: users } = await supabase
          .from("profiles")
          .select("id, username, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);
        (users || []).forEach((user) =>
          allActivities.push({
            id: `user-${user.id}`,
            type: "user_registration",
            timestamp: user.updated_at,
            link: `/profile/${user.id}`,
            data: { username: user.username },
          })
        );

        // Fetch recent clan creations
        const { data: clans } = await supabase
          .from("clans")
          .select("id, name, tag, created_at")
          .order("created_at", { ascending: false })
          .limit(5);
        (clans || []).forEach((clan) =>
          allActivities.push({
            id: `clan-${clan.id}`,
            type: "clan_creation",
            timestamp: clan.created_at,
            link: `/clans/${clan.id}`,
            data: { name: clan.name, tag: clan.tag },
          })
        );

        // Fetch recent tournament registrations
        const { data: tournamentParticipants } = await supabase
          .from("tournament_participants")
          .select("id, created_at, profiles(username, clan_members(clans(tag))), tournaments(title, id)")
          .order("created_at", { ascending: false })
          .limit(5);
        (tournamentParticipants || []).forEach((tp) =>
          allActivities.push({
            id: `tp-${tp.id}`,
            type: "tournament_registration",
            timestamp: tp.created_at,
            link: `/tournaments/${tp.tournaments?.id}`,
            data: { 
                username: tp.profiles?.username, 
                tag: tp.profiles?.clan_members?.clans?.tag ? `[${tp.profiles.clan_members.clans.tag}] ` : '',
                title: tp.tournaments?.title 
            },
          })
        );

        // Fetch recent public decks
        const { data: publicDecks } = await supabase
          .from("decks")
          .select("id, deck_name, created_at, profiles(username, clan_members(clans(tag)))")
          .eq("is_private", false)
          .order("created_at", { ascending: false })
          .limit(5);
        (publicDecks || []).forEach((deck) =>
          allActivities.push({
            id: `deck-${deck.id}`,
            type: "public_deck",
            timestamp: deck.created_at,
            link: `/deck/${deck.id}`,
            data: { 
                deck_name: deck.deck_name,
                username: deck.profiles?.username,
                tag: deck.profiles?.clan_members?.clans?.tag ? `[${deck.profiles.clan_members.clans.tag}] ` : ''
            },
          })
        );

        // News posts, comments, likes...
        const { data: newsPosts } = await supabase
          .from("news_posts")
          .select("id, title, created_at, profiles(username, clan_members(clans(tag)))")
          .order("created_at", { ascending: false })
          .limit(5);
        (newsPosts || []).forEach((post) =>
          allActivities.push({
            id: `news-${post.id}`,
            type: "news_post",
            timestamp: post.created_at,
            link: `/news/${post.id}`,
            data: {
                title: post.title,
                username: post.profiles?.username,
                tag: post.profiles?.clan_members?.clans?.tag ? `[${post.profiles.clan_members.clans.tag}] ` : ''
            }
          })
        );

        const { data: deckComments } = await supabase
          .from("deck_comments")
          .select("id, created_at, profiles(username, clan_members(clans(tag))), decks(deck_name, id)")
          .order("created_at", { ascending: false })
          .limit(5);
        (deckComments || []).forEach((comment) =>
          allActivities.push({
            id: `dcomment-${comment.id}`,
            type: "deck_comment",
            timestamp: comment.created_at,
            link: `/deck/${comment.decks?.id}`,
            data: {
                username: comment.profiles?.username,
                tag: comment.profiles?.clan_members?.clans?.tag ? `[${comment.profiles.clan_members.clans.tag}] ` : '',
                deck_name: comment.decks?.deck_name
            }
          })
        );

        const { data: newsComments } = await supabase
          .from("news_comments")
          .select("id, created_at, profiles(username, clan_members(clans(tag))), news_posts(title, id)")
          .order("created_at", { ascending: false })
          .limit(5);
        (newsComments || []).forEach((comment) =>
          allActivities.push({
            id: `ncomment-${comment.id}`,
            type: "news_comment",
            timestamp: comment.created_at,
            link: `/news/${comment.news_posts?.id}`,
            data: {
                username: comment.profiles?.username,
                tag: comment.profiles?.clan_members?.clans?.tag ? `[${comment.profiles.clan_members.clans.tag}] ` : '',
                title: comment.news_posts?.title
            }
          })
        );

        const { data: deckLikes } = await supabase
          .from("deck_likes")
          .select("id, created_at, profiles(username, clan_members(clans(tag))), decks(deck_name, id)")
          .order("created_at", { ascending: false })
          .limit(5);
        (deckLikes || []).forEach((like) =>
          allActivities.push({
            id: `dlike-${like.id}`,
            type: "deck_like",
            timestamp: like.created_at,
            link: `/deck/${like.decks?.id}`,
            data: {
                username: like.profiles?.username,
                tag: like.profiles?.clan_members?.clans?.tag ? `[${like.profiles.clan_members.clans.tag}] ` : '',
                deck_name: like.decks?.deck_name
            }
          })
        );

        const combinedActivities = allActivities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        setActivities(combinedActivities);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialActivities();
  }, []);

  const renderActivityMessage = (activity: Activity) => {
    return t(`activity_timeline.${activity.type}`, {
        ...activity.data,
        username: activity.data.username || t('activity_timeline.unknown_user')
    });
  };

  return (
    <Card className="bg-[hsl(0_0%_5%)] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold">{t('activity_timeline.title')}</CardTitle>
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
                    <LayoutList className="h-5 w-5 text-primary flex-shrink-0" />
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
                      {renderActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: currentLocale })}
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
