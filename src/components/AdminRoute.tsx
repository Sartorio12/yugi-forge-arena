import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { Loader2, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

interface AdminRouteProps {
  user: User | null;
  onLogout: () => void;
}

const AdminRoute = ({ user, onLogout }: AdminRouteProps) => {
  const { profile, isLoading, error } = useProfile(user?.id);

  useEffect(() => {
    if (!isLoading && user && profile) {
      const isAuthorized = profile.role === "admin" || 
                         profile.role === "organizer" || 
                         profile.role === "super-admin" || 
                         user.id === "80193776-6790-457c-906d-ed45ea16df9f";
      
      if (!isAuthorized) {
        console.warn("AdminRoute: User is not authorized", { 
          userId: user.id, 
          role: profile.role,
          username: profile.username 
        });
      }
    }
  }, [isLoading, user, profile]);

  const isHardcodedAdmin = user?.id === "80193776-6790-457c-906d-ed45ea16df9f";
  
  const isAuthorized = profile?.role === "admin" || 
                     profile?.role === "organizer" || 
                     profile?.role === "super-admin" || 
                     isHardcodedAdmin;

  if (isLoading && !isHardcodedAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg font-bold uppercase tracking-tighter italic">Verificando permissões...</span>
      </div>
    );
  }

  if (error && !isHardcodedAdmin) {
    console.error("AdminRoute: Error loading profile", error);
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold mb-2">Erro de Autenticação</h1>
        <p className="text-muted-foreground text-center mb-6">Não foi possível verificar suas permissões de acesso.</p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    if (user) {
      console.error("AdminRoute: Unauthorized access attempt", { userId: user.id, role: profile?.role });
    }
    return <Navigate to="/" replace />;
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

export default AdminRoute;
