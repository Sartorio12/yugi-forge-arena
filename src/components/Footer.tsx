import { Link } from "react-router-dom";
import { Instagram } from "lucide-react"; // Only Instagram is needed from lucide-react
import { FaDiscord, FaTiktok } from "react-icons/fa"; // Import Discord and TikTok icons

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card text-card-foreground py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Coluna 1: Ajuda e Suporte */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ajuda e Suporte</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/faq" className="hover:text-primary transition-colors">
                  Dúvidas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Fale Conosco
                </Link>
              </li>
              <li>
                <Link to="/support" className="hover:text-primary transition-colors">
                  Suporte
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-primary transition-colors">
                  Como Funciona
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 2: Sobre o Projeto/Empresa */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sobre o Projeto</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/team" className="hover:text-primary transition-colors">
                  Nossa Equipe
                </Link>
              </li>
              <li>
                <Link to="/news" className="hover:text-primary transition-colors">
                  Blog / Notícias
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-primary transition-colors">
                  Trabalhe Conosco
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Parcerias */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Parcerias</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/sponsors" className="hover:text-primary transition-colors">
                  Nossos Patrocinadores
                </Link>
              </li>
              <li>
                <Link to="/become-a-sponsor" className="hover:text-primary transition-colors">
                  Seja um Patrocinador
                </Link>
              </li>
              <li>
                <Link to="/partners" className="hover:text-primary transition-colors">
                  Parceiros
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Legal e Redes Sociais */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal e Social</h3>
            <ul className="space-y-2 mb-6">
              <li>
                <Link to="/terms" className="hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
            <div className="flex space-x-4">
              <a href="https://discord.gg/MmXkHgST" target="_blank" rel="noopener noreferrer" className="text-card-foreground hover:text-primary transition-colors">
                <FaDiscord className="h-6 w-6" />
              </a>
              <a href="https://www.instagram.com/staffyugioh/" target="_blank" rel="noopener noreferrer" className="text-card-foreground hover:text-primary transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="https://www.tiktok.com/@staffyugiohmasterduel" target="_blank" rel="noopener noreferrer" className="text-card-foreground hover:text-primary transition-colors">
                <FaTiktok className="h-6 w-6" />
              </a>
            </div>
          </div>
        </div>

        {/* Linha final de Copyright */}
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          &copy; {currentYear} STAFF®. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};
