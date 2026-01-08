import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Swords, Menu, Shield, Search, MessageSquare } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GlobalSearch } from "./GlobalSearch";
import UserDisplay from "./UserDisplay";
import { NotificationBell } from "./notifications/NotificationBell";
import { MessageBell } from "./chat/MessageBell";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar = ({ user, onLogout }: NavbarProps) => {
  const { profile } = useProfile(user?.id);
  const { data: clan } = useQuery({
    queryKey: ["user-clan", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("clan_members")
        .select("clans(*)")
        .eq("user_id", user.id)
        .single();
      return data?.clans;
    },
    enabled: !!user?.id,
  });

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Swords className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              STAFF YUGIOH
            </span>
          </Link>

          <div className="hidden md:block">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            {user && <MessageBell user={user} />}
            {user && <NotificationBell user={user} />}
            {user && <UserDropdown user={user} onLogout={onLogout} profile={profile} clan={clan} />}
            <NavMenu user={user} profile={profile} />
          </div>
        </div>
      </div>
    </nav>
  );
};

const UserDropdown = ({ user, onLogout, profile, clan }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.username || user?.email} />
            <AvatarFallback>
              <UserIcon />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile && <UserDisplay profile={profile} clan={clan} />}
            </p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/profile/${user.id}`}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {clan ? (
          <DropdownMenuItem asChild>
            <Link to={`/clans/${clan.id}`}>
              <Shield className="mr-2 h-4 w-4" />
              <span>Meu Clã</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/clans/create">
              <Swords className="mr-2 h-4 w-4" />
              <span>Criar Clã</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const NavMenu = ({ user, profile }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem asChild className="md:hidden">
          <Link to="/search" className="flex items-center">
            <Search className="mr-2 h-4 w-4" />
            <span>Buscar</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tournaments">Torneios</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/ranking">Ranking</Link>
        </DropdownMenuItem>
        {user && (
          <DropdownMenuItem asChild>
            <Link to="/deck-builder">Deck Builder</Link>
          </DropdownMenuItem>
        )}
        {user && (profile?.role === "admin" || profile?.role === "organizer") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Admin</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/tournaments">Gerenciar Torneios</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/news">Gerenciar Notícias</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/titles">Distribuir Títulos</Link>
            </DropdownMenuItem>
          </>
        )}
        {!user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/auth">
                <Button variant="default" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  Entrar
                </Button>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Navbar;
