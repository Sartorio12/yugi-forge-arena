import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">{t('about_page.title')}</h1>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-4">{t('about_page.mission_title')}</h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {t('about_page.mission_text')}
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-4">{t('about_page.what_we_offer_title')}</h2>
        <ul className="list-disc list-inside text-lg text-muted-foreground leading-relaxed space-y-2">
          <li>
            <span className="font-semibold">{t('about_page.offer_deck_builder')}</span> {t('about_page.offer_deck_builder_desc')}
          </li>
          <li>
            <span className="font-semibold">{t('about_page.offer_tournaments')}</span> {t('about_page.offer_tournaments_desc')} <span className="text-primary font-bold">Banimento</span> e <span className="text-primary font-bold">Genesys</span>.
          </li>
          <li>
            <span className="font-semibold">{t('about_page.offer_leagues')}</span> {t('about_page.offer_leagues_desc')}
          </li>
          <li>
            <span className="font-semibold">{t('about_page.offer_rivalries')}</span> {t('about_page.offer_rivalries_desc')}
          </li>
          <li>
            <span className="font-semibold">{t('about_page.offer_clans')}</span> {t('about_page.offer_clans_desc')}
          </li>
          <li>
            <span className="font-semibold">{t('about_page.offer_news')}</span> {t('about_page.offer_news_desc')}
          </li>
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-3xl font-semibold text-center mb-8">{t('about_page.team_title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { name: 'KSN YNUI', role: 'Fundador', image: '/KSN YNUI.jpg' },
            { name: 'CDG MAVERICK', role: 'Moderador', image: '/CDG MAVERICK.jpg' },
            { name: 'EUG CLENITOS', role: 'Moderador', image: '/EUG CLENITOS.jpg' },
            { name: 'HDS ERYNW', role: 'Moderador', image: '/HDS ERYNW.jpg' },
            { name: 'KSN DOKA', role: 'Moderador', image: '/KSN DOKA.jpg' },
            { name: 'KSN MASTDIONE', role: 'Moderador', image: '/KSN MASTDIONE.jpg' },
            { name: 'KSN SPOOKY', role: 'Moderador', image: '/KSN SPOOKY.png' },
            { name: 'TDK LENDARIO', role: 'Moderador', image: '/TDK LENDARIO.png' },
          ].map((admin) => (
            <div key={admin.name} className="flex flex-col items-center text-center">
              <img src={admin.image} alt={admin.name} className="rounded-full w-32 h-32 object-cover mb-4" />
              <h3 className="text-xl font-semibold">{admin.name}</h3>
              <p className="text-muted-foreground">{admin.role}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center">
        <p className="text-lg text-muted-foreground mb-4">
          {t('about_page.join_us')}
        </p>
        <Link to="/auth">
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md text-lg font-semibold transition-colors">
            {t('about_page.start_dueling')}
          </button>
        </Link>
      </section>
    </div>
  );
};

export default About;
