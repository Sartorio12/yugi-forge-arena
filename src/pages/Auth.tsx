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

// Esquema de validação com Zod
const passwordSchema = z.string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(/[^a-zA-Z0-9]/, "A senha deve conter pelo menos um caractere especial");

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: passwordSchema,
  username: z.string().min(3, "O nome de usuário deve ter no mínimo 3 caracteres").optional(),
});

// Função para formatar erros do Zod
const formatZodError = (error: ZodError) => {
  return error.errors.map(err => err.message).join(", ");
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);

    const result = passwordSchema.safeParse(newPassword);
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
      const validatedData = authSchema.parse({ email, password, username });
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
        title: "Confirme seu email!",
        description: "Enviamos um link de confirmação para o seu email. Por favor, verifique sua caixa de entrada para ativar sua conta.",
        duration: 10000,
      });
    } catch (error: any) {
      let errorMessage = "Erro ao criar conta";
      if (error instanceof ZodError) {
        errorMessage = formatZodError(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Erro",
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
      const validatedData = authSchema.pick({ email: true, password: true }).parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });
      
      navigate("/");
    } catch (error: any) {
      let errorMessage = "Email ou senha incorretos";
      if (error instanceof ZodError) {
        errorMessage = formatZodError(error);
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-gradient-card border-border">
        <div className="flex flex-col items-center mb-8">
          <Swords className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
            STAFF YUGIOH
          </h1>
          <p className="text-muted-foreground mt-2">Hub de Torneios e Deck Builder</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar Conta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Senha</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
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
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              <div className="text-center mt-4">
                <Link
                  to="/esqueci-senha"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Esqueceu sua senha?
                </Link>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {showConfirmationMessage ? (
              <div className="text-center space-y-4 p-4 border border-dashed rounded-lg">
                <h3 className="text-2xl font-bold text-primary">Quase lá!</h3>
                <p className="text-muted-foreground">
                  Enviamos um link de confirmação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada (e spam) para ativar sua conta.
                </p>
                <Button variant="outline" onClick={() => {
                  setShowConfirmationMessage(false);
                  setEmail('');
                  setPassword('');
                  setUsername('');
                }}>
                  Voltar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Nome de Usuário</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="duelista123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
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
                  {loading ? "Criando..." : "Criar Conta"}
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
