import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords } from "lucide-react";
import { z, ZodError } from "zod";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

// Função para formatar erros do Zod
const formatZodError = (error: ZodError) => {
  return error.errors.map(err => err.message).join(", ");
};

const Auth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Esquema de validação com Zod
  const getPasswordSchema = () => z.string()
    .min(8, t('auth_page.errors.password_min'))
    .regex(/[a-z]/, t('auth_page.errors.password_lower'))
    .regex(/[A-Z]/, t('auth_page.errors.password_upper'))
    .regex(/[0-9]/, t('auth_page.errors.password_number'))
    .regex(/[^a-zA-Z0-9]/, t('auth_page.errors.password_special'));

  const getAuthSchema = () => z.object({
    email: z.string().email(t('auth_page.errors.invalid_email')),
    password: getPasswordSchema(),
    username: z.string().min(3, t('auth_page.errors.username_min')).optional(),
  });

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    const result = getPasswordSchema().safeParse(newPassword);
    if (!result.success) {
      setPasswordErrors(result.error.errors.map(err => err.message));
    } else {
      setPasswordErrors([]);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = getAuthSchema().parse({ email, password, username });
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          data: { username: validatedData.username },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setShowConfirmationMessage(true);
      toast({
        title: t('auth_page.toast.confirm_email'),
        description: t('auth_page.toast.confirm_email_desc'),
        duration: 10000,
      });
    } catch (error: any) {
      let errorMessage = t('auth_page.errors.create_account_error');
      if (error instanceof ZodError) {
        errorMessage = formatZodError(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: t('create_clan_page.toast.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = getAuthSchema().pick({ email: true, password: true }).parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      toast({
        title: t('auth_page.toast.welcome'),
        description: t('auth_page.toast.login_success'),
      });
      
      navigate("/");
    } catch (error: any) {
      let errorMessage = t('auth_page.errors.signin_error');
      if (error instanceof ZodError) {
        errorMessage = formatZodError(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: t('create_clan_page.toast.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
        <div className="flex flex-col items-center mb-8">
          <Swords className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            STAFF YUGIOH
          </h1>
          <p className="text-muted-foreground mt-2">{t('auth_page.hub_subtitle')}</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="signin">{t('auth_page.signin_tab')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth_page.signup_tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">{t('auth_page.email_label')}</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder={t('auth_page.email_placeholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">{t('auth_page.password_label')}</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder={t('auth_page.password_placeholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                disabled={loading}
              >
                {loading ? t('auth_page.signing_in') : t('auth_page.signin_btn')}
              </Button>
              <div className="text-center mt-4">
                <Link
                  to="/esqueci-senha"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('auth_page.forgot_password')}
                </Link>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {showConfirmationMessage ? (
              <div className="text-center space-y-4 p-4 border border-dashed rounded-lg">
                <h3 className="text-2xl font-bold text-primary">{t('auth_page.almost_there')}</h3>
                <p className="text-muted-foreground">
                  {t('auth_page.confirmation_sent')} <strong>{email}</strong>. {t('auth_page.toast.confirm_email_desc')}
                </p>
                <Button variant="outline" onClick={() => {
                  setShowConfirmationMessage(false);
                  setEmail('');
                  setPassword('');
                  setUsername('');
                }}>
                  {t('auth_page.back_btn')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">{t('auth_page.username_label')}</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder={t('auth_page.username_placeholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth_page.email_label')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder={t('auth_page.email_placeholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth_page.password_label')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={t('auth_page.password_placeholder')}
                    value={password}
                    onChange={handlePasswordChange} // Use the new handler
                    required
                  />
                  {passwordErrors.length > 0 && (
                    <div className="text-sm text-red-500 space-y-1 mt-1">
                      {passwordErrors.map((msg, index) => (
                        <p key={index}>{msg}</p>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  disabled={loading}
                >
                  {loading ? t('auth_page.creating_account') : t('auth_page.signup_btn')}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};


export default Auth;

