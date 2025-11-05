import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { Trophy, Users, Layers } from "lucide-react";

interface IndexProps {
  user: User | null;
  onLogout: () => void;
}

const Index = ({ user, onLogout }: IndexProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} onLogout={onLogout} />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
          STAFF YUGIOH
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto">
          Seu hub completo de Yu-Gi-Oh! com sistema de perfis, torneios e deck builder integrado
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/tournaments">
            <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg px-8 py-6">
              Ver Torneios
            </Button>
          </Link>
          {user ? (
            <Link to="/deck-builder">
              <Button variant="secondary" className="text-lg px-8 py-6">
                Criar Deck
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="secondary" className="text-lg px-8 py-6">
                Criar Conta
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Trophy className="h-12 w-12 text-primary" />}
            title="Torneios"
            description="Acompanhe e participe dos próximos torneios de Yu-Gi-Oh! com inscrições simplificadas"
          />
          <FeatureCard
            icon={<Layers className="h-12 w-12 text-primary" />}
            title="Deck Builder"
            description="Crie e salve seus decks com integração completa à API do YGOProDeck"
          />
          <FeatureCard
            icon={<Users className="h-12 w-12 text-primary" />}
            title="Perfis"
            description="Personalize seu perfil e mostre seus melhores decks para a comunidade"
          />
        </div>
      </section>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="p-8 rounded-lg bg-gradient-card border border-border hover:shadow-glow transition-all duration-300 group">
      <div className="mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
