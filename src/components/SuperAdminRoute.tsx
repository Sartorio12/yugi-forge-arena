import { Navigate, Outlet } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface SuperAdminRouteProps {
  user: User | null;
  onLogout: () => void;
}

const SuperAdminRoute = ({ user, onLogout }: SuperAdminRouteProps) => {
  const { profile, isLoading } = useProfile(user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-4 text-lg">Verificando permissões...</span>
      </div>
    );
  }

  // This route is only for super-admins
  const isAuthorized = profile?.role === "super-admin" || user?.id === "80193776-6790-457c-906d-ed45ea16df9f";

  if (!user || (!isLoading && !isAuthorized)) {
    // Redirect non-super-admins to the main admin dashboard or home
    return <Navigate to="/dashboard/tournaments" replace />;
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <Outlet />
    </>
  );
};

export default SuperAdminRoute;
