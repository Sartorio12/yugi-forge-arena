import { Navigate, Outlet } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface AdminRouteProps {
  user: User | null;
  onLogout: () => void;
}

const AdminRoute = ({ user, onLogout }: AdminRouteProps) => {
  const { profile, isLoading } = useProfile(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Verificando permissões...</span>
      </div>
    );
  }

  const isAuthorized = profile?.role === "admin" || profile?.role === "organizer";

  if (!user || !isAuthorized) {
    // Redirect them to the home page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <Outlet />
    </>
  );
};

export default AdminRoute;
