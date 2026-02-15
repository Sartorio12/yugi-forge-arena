import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

interface SuperAdminRouteProps {
  user: User | null;
  onLogout: () => void;
}

const SuperAdminRoute = ({ user, onLogout }: SuperAdminRouteProps) => {
  const { profile, isLoading, error } = useProfile(user?.id);

  const isHardcodedAdmin = user?.id === "80193776-6790-457c-906d-ed45ea16df9f";

  useEffect(() => {
    if (!isLoading && user && profile) {
      const isAuthorized = profile.role === "super-admin" || isHardcodedAdmin;
      
      if (!isAuthorized) {
        console.warn("SuperAdminRoute: User is not authorized", { 
          userId: user.id, 
          role: profile.role,
          username: profile.username 
        });
      }
    }
  }, [isLoading, user, profile, isHardcodedAdmin]);

  if (isLoading && !isHardcodedAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg font-bold uppercase tracking-tighter italic">Verificando permissões...</span>
      </div>
    );
  }

  if (error && !isHardcodedAdmin) {
    console.error("SuperAdminRoute: Error loading profile", error);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Erro de Autenticação</h1>
        <p className="text-muted-foreground text-center mb-6">Não foi possível verificar suas permissões de super-admin.</p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    );
  }

  // This route is only for super-admins
  const isAuthorized = profile?.role === "super-admin" || isHardcodedAdmin;

  if (!user || !isAuthorized) {
    if (user) {
      console.error("SuperAdminRoute: Unauthorized access attempt", { userId: user.id, role: profile?.role });
    }
    // Redirect non-super-admins to the main admin dashboard
    return <Navigate to="/dashboard/tournaments" replace />;
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="animate-in fade-in duration-500">
        <Outlet />
      </div>
    </>
  );
};

export default SuperAdminRoute;
