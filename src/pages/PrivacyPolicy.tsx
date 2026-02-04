import Navbar from "@/components/Navbar";
import { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";

interface PrivacyPolicyProps {
  user: User | null;
  onLogout: () => void;
}

const PrivacyPolicy = ({ user, onLogout }: PrivacyPolicyProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar user={user} onLogout={onLogout} />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-primary">{t('privacy_policy.title')}</h1>
        
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.intro_title')}</h2>
            <p>
              {t('privacy_policy.intro_text_1')}
            </p>
            <p className="mt-2">
              {t('privacy_policy.intro_text_2')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.data_title')}</h2>
            <p>{t('privacy_policy.data_text')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>{t('privacy_policy.data_account')}</strong> {t('privacy_policy.data_account_desc')}</li>
              <li><strong>{t('privacy_policy.data_third_party')}</strong> {t('privacy_policy.data_third_party_desc')}</li>
              <li><strong>{t('privacy_policy.data_usage')}</strong> {t('privacy_policy.data_usage_desc')}</li>
              <li><strong>{t('privacy_policy.data_logs')}</strong> {t('privacy_policy.data_logs_desc')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.usage_title')}</h2>
            <p>{t('privacy_policy.usage_text')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('privacy_policy.usage_identity')}</li>
              <li>{t('privacy_policy.usage_tournaments')}</li>
              <li>{t('privacy_policy.usage_interaction')}</li>
              <li>{t('privacy_policy.usage_communication')}</li>
              <li>{t('privacy_policy.usage_security')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.sharing_title')}</h2>
            <p>
              {t('privacy_policy.sharing_text')}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>{t('privacy_policy.sharing_public')}</strong> {t('privacy_policy.sharing_public_desc')}</li>
              <li><strong>{t('privacy_policy.sharing_organizers')}</strong> {t('privacy_policy.sharing_organizers_desc')}</li>
              <li><strong>{t('privacy_policy.sharing_legal')}</strong> {t('privacy_policy.sharing_legal_desc')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.cookies_title')}</h2>
            <p>
              {t('privacy_policy.cookies_text')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.rights_title')}</h2>
            <p>{t('privacy_policy.rights_text')}</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{t('privacy_policy.rights_confirm')}</li>
              <li>{t('privacy_policy.rights_access')}</li>
              <li>{t('privacy_policy.rights_correct')}</li>
              <li>{t('privacy_policy.rights_delete')}</li>
            </ul>
            <p className="mt-2">
              {t('privacy_policy.rights_contact')}
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">{t('privacy_policy.changes_title')}</h2>
            <p>
              {t('privacy_policy.changes_text')}
            </p>
          </section>

          <section className="pt-4 border-t border-border">
            <p className="text-sm">
              {t('privacy_policy.last_update')}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
