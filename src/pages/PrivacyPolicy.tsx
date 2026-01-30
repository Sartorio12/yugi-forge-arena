import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";

interface PrivacyPolicyProps {
  user: User | null;
  onLogout: () => void;
}

const PrivacyPolicy = ({ user, onLogout }: PrivacyPolicyProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-primary">Política de Privacidade</h1>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. Introdução</h2>
            <p>
              Bem-vindo ao <strong>Yugi Forge Arena</strong> (doravante referido como "Plataforma" ou "nós"). 
              A sua privacidade é fundamental para nós. Esta Política de Privacidade descreve como coletamos, 
              usamos, armazenamos e protegemos suas informações pessoais ao utilizar nosso site e serviços.
            </p>
            <p className="mt-2">
              Ao acessar ou utilizar a Plataforma, você concorda com os termos descritos nesta política. 
              Nossas práticas estão alinhadas com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. Dados que Coletamos</h2>
            <p>Para o funcionamento adequado da Plataforma e organização de torneios, coletamos os seguintes dados:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Informações de Conta:</strong> Nome de usuário, endereço de e-mail e avatar (fornecidos via autenticação).</li>
              <li><strong>Integrações de Terceiros:</strong> ID e Username do Discord (caso vincule sua conta para funcionalidades de comunidade).</li>
              <li><strong>Dados de Uso:</strong> Decks criados, histórico de partidas, participação em torneios e comentários.</li>
              <li><strong>Logs Técnicos:</strong> Endereço IP e dados de navegador para fins de segurança e monitoramento de abusos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. Como Usamos seus Dados</h2>
            <p>Utilizamos suas informações estritamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Gerenciar sua identidade e acesso à Plataforma.</li>
              <li>Organizar torneios, gerar pareamentos e manter rankings (Hall da Fama).</li>
              <li>Permitir a interação com outros usuários (comentários, criação de clãs).</li>
              <li>Comunicar atualizações importantes sobre a plataforma ou eventos em que você se inscreveu.</li>
              <li>Prevenir fraudes, contas duplicadas ("smurfs") e garantir a integridade competitiva.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. Compartilhamento de Dados</h2>
            <p>
              <strong>Não vendemos</strong> seus dados pessoais para terceiros. Seus dados podem ser compartilhados apenas nas seguintes situações:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Público:</strong> Seu nome de usuário, avatar, decks (se públicos) e histórico de torneios são visíveis para outros usuários da Plataforma.</li>
              <li><strong>Organizadores de Torneio:</strong> Administradores de torneios em que você se inscreve podem visualizar seu Discord ID para coordenação de partidas.</li>
              <li><strong>Obrigação Legal:</strong> Quando exigido por lei ou ordem judicial.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Cookies e Tecnologias Semelhantes</h2>
            <p>
              Utilizamos cookies essenciais para manter sua sessão de login ativa (através do Supabase Auth). 
              Não utilizamos cookies de rastreamento publicitário de terceiros sem o seu consentimento explícito.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Seus Direitos (LGPD)</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Confirmar a existência de tratamento de dados.</li>
              <li>Acessar seus dados.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados (via página de Perfil).</li>
              <li>Solicitar a exclusão de seus dados pessoais (sujeito a retenção legal ou para integridade de históricos de torneios passados).</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato através do nosso Discord ou formulário de contato.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre mudanças significativas através de avisos na Plataforma ou via e-mail.
            </p>
          </section>

          <section className="pt-4 border-t border-border">
            <p className="text-sm">
              Última atualização: Janeiro de 2026.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
