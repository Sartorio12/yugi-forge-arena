import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Swords } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

const Navbar = ({ user, onLogout }: NavbarProps) => {
  const navigate = useNavigate();
  const { profile, isLoading } = useProfile(user);

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

          <div className="flex items-center gap-6">
            <Link to="/tournaments">
              <Button variant="ghost" className="hover:text-primary transition-colors">
                Torneios
              </Button>
            </Link>
            <Link to="/ranking">
              <Button variant="ghost" className="hover:text-primary transition-colors">
                Ranking
              </Button>
            </Link>
            
            {user ? (
              <>
                {!isLoading && (profile?.role === "admin" || profile?.role === "organizer") && (
                  <>
                    <Link to="/dashboard/tournaments">
                      <Button variant="ghost" className="hover:text-primary transition-colors">
                        Gerenciar Torneios
                      </Button>
                    </Link>
                    <Link to="/dashboard/news">
                      <Button variant="ghost" className="hover:text-primary transition-colors">
                        Gerenciar Notícias
                      </Button>
                    </Link>
                  </>
                )}
                <Link to="/deck-builder">
                  <Button variant="ghost" className="hover:text-primary transition-colors">
                    Deck Builder
                  </Button>
                </Link>
                <Link to={`/profile/${user.id}`}>
                  <Button variant="ghost" size="icon" className="hover:text-primary transition-colors">
                    <UserIcon className="h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onLogout}
                  className="hover:text-destructive transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
                  Entrar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
