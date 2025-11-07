import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Swords } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  username: z.string().min(3, { message: "Nome de usuário deve ter no mínimo 3 caracteres" }).optional(),
});

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);

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
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = authSchema.parse({ email, password });
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
      toast({
        title: "Erro",
        description: error.message || "Email ou senha incorretos",
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
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
