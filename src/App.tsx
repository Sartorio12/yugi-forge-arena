import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Tournaments from "./pages/Tournaments";
import TournamentDetail from "./pages/TournamentDetail";
import Profile from "./pages/Profile";
import DeckBuilder from "./pages/DeckBuilder";
import DeckPage from "./pages/DeckPage";
import RankingPage from "./pages/Ranking";
import NotFound from "./pages/NotFound";
import AdminRoute from "./components/AdminRoute";
import TournamentDashboard from "./pages/admin/TournamentDashboard";
import TournamentManagementPage from "./pages/admin/TournamentManagement";
import NewsDashboard from "./pages/admin/NewsDashboard";
import NewsPostPage from "./pages/NewsPostPage";
import NewsListPage from "./pages/NewsListPage";
import NewsEditorFormPage from "./pages/admin/NewsEditorFormPage";
import { RequestPasswordResetPage } from './pages/RequestPasswordResetPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import CreateClanPage from "./pages/CreateClanPage";
import ClanProfilePage from "./pages/ClanProfilePage";
import ClanManagementPage from "./pages/ClanManagementPage";
import About from "./pages/About"; // Import the About component
import Contact from "./pages/Contact"; // Import the Contact component
import { Footer } from "./components/Footer"; // Import the Footer component
import SearchPage from "./pages/SearchPage";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires an initial event with the current session,
    // so we don't need to call getSession() explicitly.
    // This avoids a potential race condition.
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
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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

            {/* Password Reset Routes */}
            <Route path="/esqueci-senha" element={<RequestPasswordResetPage />} />
            <Route path="/atualizar-senha" element={<UpdatePasswordPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Admin Routes */}
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
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer /> {/* Add the Footer component here */}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
