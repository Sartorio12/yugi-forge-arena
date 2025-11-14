import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">Sobre Nós</h1>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-4">Nossa Missão</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          No coração da comunidade Yu-Gi-Oh!, a STAFF® nasceu da paixão por duelos estratégicos e da visão de criar um espaço onde jogadores de todos os níveis pudessem se conectar, competir e crescer juntos. Nossa missão é fomentar um ambiente vibrante e inclusivo, oferecendo ferramentas inovadoras para construção de decks, organização de torneios e uma plataforma para compartilhar notícias e estratégias. Acreditamos que cada duelista tem uma história para contar, e estamos aqui para ajudar a escrevê-las.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-4">O Que Oferecemos</h2>
        <ul className="list-disc list-inside text-lg text-muted-foreground leading-relaxed space-y-2">
          <li>
            <span className="font-semibold">Deck Builder Avançado:</span> Crie, edite e gerencie seus decks com facilidade, com acesso a um vasto banco de dados de cartas e validação de regras.
          </li>
          <li>
            <span className="font-semibold">Sistema de Torneios Robusto:</span> Participe ou organize torneios com gerenciamento completo, desde inscrições até rankings.
          </li>
          <li>
            <span className="font-semibold">Comunidade Ativa:</span> Conecte-se com outros duelistas, compartilhe suas criações e discuta as últimas novidades do mundo de Yu-Gi-Oh!.
          </li>
          <li>
            <span className="font-semibold">Notícias e Artigos:</span> Mantenha-se atualizado com as banlists, lançamentos e análises estratégicas.
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-center mb-8">Nossa Equipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Espaço para os ADMs */}
          <div className="flex flex-col items-center text-center">
            <img src="https://via.placeholder.com/150" alt="Nome do ADM 1" className="rounded-full w-32 h-32 object-cover mb-4" />
            <h3 className="text-xl font-semibold">Nome do ADM 1</h3>
            <p className="text-muted-foreground">Função/Descrição</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img src="https://via.placeholder.com/150" alt="Nome do ADM 2" className="rounded-full w-32 h-32 object-cover mb-4" />
            <h3 className="text-xl font-semibold">Nome do ADM 2</h3>
            <p className="text-muted-foreground">Função/Descrição</p>
          </div>
          <div className="flex flex-col items-center text-center">
            <img src="https://via.placeholder.com/150" alt="Nome do ADM 3" className="rounded-full w-32 h-32 object-cover mb-4" />
            <h3 className="text-xl font-semibold">Nome do ADM 3</h3>
            <p className="text-muted-foreground">Função/Descrição</p>
          </div>
        </div>
      </section>

      <section className="text-center">
        <p className="text-lg text-muted-foreground mb-4">
          Junte-se a nós e faça parte da STAFF®!
        </p>
        <Link to="/auth">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md text-lg font-semibold transition-colors">
            Comece a Duelar Agora
          </button>
        </Link>
      </section>
    </div>
  );
};

export default About;
