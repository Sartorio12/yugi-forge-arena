import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();
  const whatsappUrl = "https://api.whatsapp.com/send/?phone=5511913290924&text&type=phone_number&app_absent=0";

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)]">
      <h1 className="text-5xl font-bold mb-4">{t('contact_page.title')}</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mb-8">
        {t('contact_page.subtitle')}
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-green-500 text-white hover:bg-green-600 px-8 py-4 rounded-md text-lg font-semibold transition-colors flex items-center space-x-2 mb-4"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        <span>{t('contact_page.whatsapp_btn')}</span>
      </a>
      <Link to="/">
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-md text-lg font-semibold transition-colors">
          {t('contact_page.back_home')}
        </button>
      </Link>
    </div>
  );
};

export default Contact;
