import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useProfile";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Home, Loader2, Heart, MessageSquare, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Interfaces
interface CardData {
  id: string;
  name: string;
  type: string;
  card_images: { image_url: string }[];
}

interface DeckPageProps {
  user: User | null;
  onLogout: () => void;
}

interface Comment {
  id: number;
  comment_text: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  } | null;
}

const DeckPage = ({ user, onLogout }: DeckPageProps) => {
  const { id } = useParams<{ id: string }>();
  const deckId = Number(id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile } = useProfile();

  const [newComment, setNewComment] = useState("");

  // --- QUERIES ---
  const { data: deck, isLoading: isLoadingDeck, error: deckError } = useQuery({
    queryKey: ["deck", deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from("decks").select("*").eq("id", deckId).single();
      if (error) throw new Error(`Deck com ID ${id} não encontrado.`);
      return data;
    },
    enabled: !!deckId,
  });

  const { data: deckCards, isLoading: isLoadingCards } = useQuery({
    queryKey: ["deckCards", deckId],
    queryFn: async () => {
      const { data: cardIds, error } = await supabase.from("deck_cards").select("card_api_id, deck_section").eq("deck_id", deckId);
      if (error) throw error;
      if (!cardIds || cardIds.length === 0) return { main: [], extra: [], side: [] };

      const allCardIds = [...new Set(cardIds.map(c => c.card_api_id))].join(',');
      const apiResponse = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${allCardIds}`);
      const apiData = await apiResponse.json();
      if (apiData.error) throw new Error("Erro ao buscar dados das cartas na API externa.");

      const cardDataMap = new Map(apiData.data.map((c: CardData) => [String(c.id), c]));
      const main = cardIds.filter(c => c.deck_section === 'main').map(c => cardDataMap.get(String(c.card_api_id))).filter(Boolean) as CardData[];
      const extra = cardIds.filter(c => c.deck_section === 'extra').map(c => cardDataMap.get(String(c.card_api_id))).filter(Boolean) as CardData[];
      const side = cardIds.filter(c => c.deck_section === 'side').map(c => cardDataMap.get(String(c.card_api_id))).filter(Boolean) as CardData[];
      
      return { main, extra, side };
    },
    enabled: !!deckId,
  });

  const { data: likes, isLoading: isLoadingLikes } = useQuery({
    queryKey: ["deckLikes", deckId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deck_likes").select("user_id").eq("deck_id", deckId);
      if (error) throw error;
      return data;
    },
    enabled: !!deckId && !deck?.is_private,
  });

  const { data: comments, isLoading: isLoadingComments } = useQuery({
    queryKey: ["deckComments", deckId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deck_comments")
        .select("*, profiles (username, avatar_url)")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!deckId && !deck?.is_private,
  });

  const hasLiked = !!(user && likes?.some(like => like.user_id === user.id));

  // --- MUTATIONS ---
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Você precisa estar logado para curtir.");
      const { error } = await supabase.from("deck_likes").insert({ deck_id: deckId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deckLikes", deckId] }),
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Você precisa estar logado para descurtir.");
      const { error } = await supabase.from("deck_likes").delete().match({ deck_id: deckId, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["deckLikes", deckId] }),
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const commentMutation = useMutation({
    mutationFn: async (commentText: string) => {
      if (!user) throw new Error("Você precisa estar logado para comentar.");
      const { error } = await supabase.from("deck_comments").insert({ deck_id: deckId, user_id: user.id, comment_text: commentText });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["deckComments", deckId] });
    },
    onError: (error: any) => toast({ title: "Erro ao comentar", description: error.message, variant: "destructive" }),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const { error } = await supabase.from("deck_comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Comentário excluído." });
      queryClient.invalidateQueries({ queryKey: ["deckComments", deckId] });
    },
    onError: (error: any) => toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }),
  });

  // --- RENDER ---
  const isLoading = isLoadingDeck || isLoadingCards;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="h-8 w-8 animate-spin mr-4" />
        Carregando Deck...
      </div>
    );
  }

  if (deckError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-red-500">
        <p className="text-2xl mb-4">{deckError.message}</p>
        <Button asChild><Link to="/"><Home className="mr-2 h-4 w-4" /> Voltar para a Home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar user={user} onLogout={onLogout} />
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
          {deck?.deck_name}
        </h1>
        {deck?.is_private && <p className="text-yellow-400 mb-8">Este deck é privado.</p>}

        <div className="space-y-8">
          <DeckSection title="Main Deck" cards={deckCards?.main || []} />
          <DeckSection title="Extra Deck" cards={deckCards?.extra || []} />
          <DeckSection title="Side Deck" cards={deckCards?.side || []} />
        </div>

        {!deck?.is_private && (
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="flex items-center gap-6 mb-8">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => hasLiked ? unlikeMutation.mutate() : likeMutation.mutate()}
                disabled={!user || likeMutation.isPending || unlikeMutation.isPending || isLoadingLikes}
              >
                <Heart className={`mr-2 h-5 w-5 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                {isLoadingLikes ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>{likes?.length || 0}</span>}
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="h-5 w-5" />
                <span>{comments?.length || 0} Comentários</span>
              </div>
            </div>

            <Card className="bg-gradient-card border-border">
              <CardHeader><h2 className="text-2xl font-bold">Comentários</h2></CardHeader>
              <CardContent>
                {user && (
                  <div className="flex gap-4 mb-6">
                    <Avatar>
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow relative">
                      <Textarea
                        placeholder="Escreva um comentário..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="pr-12"
                      />
                      <Button 
                        size="icon" 
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => commentMutation.mutate(newComment)}
                        disabled={!newComment.trim() || commentMutation.isPending}
                      >
                        {commentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  {isLoadingComments ? (
                    <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : comments && comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-4">
                        <Avatar>
                          <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-bold">{comment.profiles?.username || "Usuário"}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                              </span>
                            </div>
                            {(user?.id === comment.user_id || profile?.role === 'admin' || profile?.role === 'organizer') && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCommentMutation.mutate(comment.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-foreground/90 mt-1 whitespace-pre-wrap">{comment.comment_text}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

const DeckSection = ({ title, cards }: { title: string, cards: CardData[] }) => {
  if (cards.length === 0) return null;
  const bgColor = title === "Extra Deck" ? "bg-indigo-950" : title === "Side Deck" ? "bg-emerald-950" : "bg-stone-900";
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-muted-foreground">{cards.length} Cartas</span>
      </div>
      <div className={`${bgColor} p-4 rounded-lg`}>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {cards.map((card, index) => (
            <div key={`${card.id}-${index}`} className="relative group">
              <img src={card.card_images[0].image_url} alt={card.name} className="rounded-md w-full transition-transform duration-200 group-hover:scale-125 group-hover:z-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeckPage;