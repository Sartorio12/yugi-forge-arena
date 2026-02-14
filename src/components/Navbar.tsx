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
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  hideLogo?: boolean;
}

const Navbar = ({ user, onLogout, hideLogo = false }: NavbarProps) => {
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
          {!hideLogo ? (
            <Link to="/" className="flex items-center gap-2 group">
              <Swords className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                STAFF YUGIOH
              </span>
            </Link>
          ) : <div />}

          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
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

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
  profile: any;
  clan: any;
}

const UserDropdown = ({ user, onLogout, profile, clan }: UserDropdownProps) => {
  const { t } = useTranslation();
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
            <div className="text-sm font-medium leading-none">
              {profile && <UserDisplay profile={profile} clan={clan} />}
            </div>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={`/profile/${user.id}`}>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>{t('navbar.my_profile')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {clan ? (
          <DropdownMenuItem asChild>
            <Link to={`/clans/${clan.id}`}>
              <Shield className="mr-2 h-4 w-4" />
              <span>{t('navbar.my_clan')}</span>
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/clans/create">
              <Swords className="mr-2 h-4 w-4" />
              <span>{t('navbar.create_clan')}</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('navbar.logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface NavMenuProps {
  user: User | null;
  profile: any;
}

const NavMenu = ({ user, profile }: NavMenuProps) => {
  const { t } = useTranslation();
  const isSuperAdmin = profile?.role === 'super-admin' || user?.id === "80193776-6790-457c-906d-ed45ea16df9f";
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
            <span>{t('navbar.search')}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/tournaments">{t('navbar.tournaments')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/ranking">{t('navbar.ranking')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/rivalry">{t('navbar.rivalry')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/bolao">{t('navbar.sweepstakes')}</Link>
        </DropdownMenuItem>
        {user && (
          <DropdownMenuItem asChild>
            <Link to="/deck-builder">{t('navbar.deck_builder')}</Link>
          </DropdownMenuItem>
        )}
        {user && (profile?.role === "admin" || profile?.role === "organizer" || profile?.role === "super-admin" || isSuperAdmin) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t('navbar.admin')}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/tournaments">{t('navbar.manage_tournaments')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/news">{t('navbar.manage_news')}</Link>
            </DropdownMenuItem>
            {isSuperAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/matches">{t('navbar.manage_matches')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/sweepstakes">Gerenciar Bolões</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/titles">{t('navbar.distribute_titles')}</Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem asChild>
              <Link to="/dashboard/stats">{t('navbar.stats')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/dashboard/broadcasts">{t('navbar.manage_broadcasts')}</Link>
            </DropdownMenuItem>
          </>
        )}
        {!user && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/auth">
                <Button variant="default" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  {t('navbar.login')}
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
