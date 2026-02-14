import { useEffect, useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { PresenceProvider } from "./components/PresenceProvider";
import { ChatProvider } from "./components/chat/ChatProvider";
import { ChatDock } from "./components/chat/ChatDock";
import { GlobalChatListener } from "./components/chat/GlobalChatListener";
import { LevelUpListener } from "./components/LevelUpListener";
import ScrollToTop from "./components/ScrollToTop";
import { UpdateManager } from "./components/UpdateManager";
import { DiscordUsernameModal } from "./components/DiscordUsernameModal";
import { AbsenceRuleNotice } from "./components/AbsenceRuleNotice";
import { ConditionalFooter } from "./components/ConditionalFooter";
import { Loader2 } from "lucide-react";

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Tournaments = lazy(() => import("./pages/Tournaments"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const GroupStandingsPage = lazy(() => import("./pages/GroupStandingsPage"));
const TournamentBracketPage = lazy(() => import("./pages/TournamentBracketPage"));
const Profile = lazy(() => import("./pages/Profile"));
const DeckBuilder = lazy(() => import("./pages/DeckBuilder"));
const DeckPage = lazy(() => import("./pages/DeckPage"));
const CommunityDecksPage = lazy(() => import("./pages/CommunityDecksPage"));
const RankingPage = lazy(() => import("./pages/Ranking"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SuperAdminRoute = lazy(() => import("./components/SuperAdminRoute"));
const AdminRoute = lazy(() => import("./components/AdminRoute"));
const TournamentDashboard = lazy(() => import("./pages/admin/TournamentDashboard"));
const TournamentManagementPage = lazy(() => import("./pages/admin/TournamentManagement"));
const NewsDashboard = lazy(() => import("./pages/admin/NewsDashboard"));
const NewsPostPage = lazy(() => import("./pages/NewsPostPage"));
const NewsListPage = lazy(() => import("./pages/NewsListPage"));
const NewsEditorFormPage = lazy(() => import("./pages/admin/NewsEditorFormPage"));
const RewardsDistributionPage = lazy(() => import("./pages/admin/RewardsDistributionPage"));
const TournamentStatsPage = lazy(() => import("./pages/admin/TournamentStatsPage"));
const BroadcastDashboard = lazy(() => import("./pages/admin/BroadcastDashboard"));
const MatchManagementPage = lazy(() => import("./pages/admin/MatchManagementPage"));
const CardManagementPage = lazy(() => import("./pages/admin/CardManagementPage"));
const SweepstakeDashboard = lazy(() => import("./pages/admin/SweepstakeDashboard"));
const RequestPasswordResetPage = lazy(() => import("./pages/RequestPasswordResetPage").then(module => ({ default: module.RequestPasswordResetPage })));
const UpdatePasswordPage = lazy(() => import("./pages/UpdatePasswordPage").then(module => ({ default: module.UpdatePasswordPage })));
const CreateClanPage = lazy(() => import("./pages/CreateClanPage"));
const ClanProfilePage = lazy(() => import("./pages/ClanProfilePage"));
const ClanManagementPage = lazy(() => import("./pages/ClanManagementPage"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const MetaDeckExamples = lazy(() => import("./pages/MetaDeckExamples"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const RivalryPage = lazy(() => import("./pages/RivalryPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const SweepstakePage = lazy(() => import("./pages/SweepstakePage"));
const SwissStandingsPage = lazy(() => import("./pages/SwissStandingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes global default
      gcTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Local Auto-Login logic for development
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const targetUserId = "80193776-6790-457c-906d-ed45ea16df9f";

    const setupSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (isLocal && !currentSession) {
        console.log("🛠️ Local environment detected. Forcing auto-login for Admin ID...");
        // Fetch the user data manually to mock the session if needed
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();

        if (profile) {
          // Note: We use a simplified mock user object for local dev UI
          const mockUser = { id: targetUserId, email: "admin@local.test", user_metadata: { username: profile.username } } as any;
          setUser(mockUser);
          setLoading(false);
          return;
        }
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };

    setupSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (user) {
      await supabase.from('profiles').update({
        is_online: false,
        last_seen: new Date().toISOString(),
      }).eq('id', user.id);
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UpdateManager />
          <ScrollToTop />
          <PresenceProvider user={user}>
            <ChatProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index user={user} onLogout={handleLogout} />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/tournaments"
                    element={<Tournaments user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/tournaments/:id"
                    element={<TournamentDetail user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/tournaments/:id/swiss"
                    element={<SwissStandingsPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/tournaments/:id/groups"
                    element={<GroupStandingsPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/tournaments/:id/bracket"
                    element={<TournamentBracketPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/profile/:id"
                    element={<Profile user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/deck-builder"
                    element={<DeckBuilder user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/deck/:id"
                    element={<DeckPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/community-decks"
                    element={<CommunityDecksPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/ranking"
                    element={<RankingPage user={user} onLogout={handleLogout} />}
                  />
                  <Route path="/news" element={<NewsListPage user={user} onLogout={handleLogout} />} />
                  <Route
                    path="/news/:id"
                    element={<NewsPostPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/clans/create"
                    element={<CreateClanPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/clans/:id"
                    element={<ClanProfilePage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/clans/:id/manage"
                    element={<ClanManagementPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/search"
                    element={<SearchPage user={user} onLogout={handleLogout} />}
                  />
                  <Route
                    path="/meta/*"
                    element={<MetaDeckExamples user={user} onLogout={handleLogout} />}
                  />
                  <Route 
                    path="/rivalry" 
                    element={<RivalryPage user={user} onLogout={handleLogout} />} 
                  />
                  <Route 
                    path="/bolao" 
                    element={<SweepstakePage user={user} onLogout={handleLogout} />} 
                  />
                  <Route
                    path="/messages"
                    element={<MessagesPage user={user} onLogout={handleLogout} />}
                  />
  
                  <Route path="/esqueci-senha" element={<RequestPasswordResetPage />} />
                  <Route path="/atualizar-senha" element={<UpdatePasswordPage />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy" element={<PrivacyPolicy user={user} onLogout={handleLogout} />} />
  
                  <Route element={<AdminRoute user={user} onLogout={handleLogout} />}>
                    <Route
                      path="/dashboard/tournaments"
                      element={<TournamentDashboard />}
                    />
                    <Route
                      path="/dashboard/tournaments/:id/manage"
                      element={<TournamentManagementPage />}
                    />
                    <Route
                      path="/dashboard/news"
                      element={<NewsDashboard />}
                    />
                    <Route
                      path="/dashboard/news/create"
                      element={<NewsEditorFormPage user={user} />}
                    />
                    <Route
                      path="/dashboard/news/:id/edit"
                      element={<NewsEditorFormPage user={user} />}
                    />
                     <Route
                      path="/dashboard/stats"
                      element={<TournamentStatsPage />}
                    />
                    <Route
                      path="/dashboard/broadcasts"
                      element={<BroadcastDashboard />}
                    />
                  </Route>

                  <Route element={<SuperAdminRoute user={user} onLogout={handleLogout} />}>
                    <Route
                      path="/dashboard/titles"
                      element={<RewardsDistributionPage />}
                    />
                    <Route
                      path="/dashboard/matches"
                      element={<MatchManagementPage />}
                    />
                     <Route
                      path="/dashboard/cards/add"
                      element={<CardManagementPage />}
                    />
                    <Route
                      path="/dashboard/sweepstakes"
                      element={<SweepstakeDashboard />}
                    />
                  </Route>
  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <ConditionalFooter />
              <ChatDock currentUser={user} />
              <GlobalChatListener currentUser={user} />
              <LevelUpListener user={user} />
              <DiscordUsernameModal userId={user?.id} />
              <AbsenceRuleNotice />
            </ChatProvider>
          </PresenceProvider>
          <SpeedInsights />
          <Analytics />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
