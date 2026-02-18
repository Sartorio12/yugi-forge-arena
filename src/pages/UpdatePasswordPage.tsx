// src/pages/UpdatePasswordPage.tsx
import { supabase } from '../integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPasswordSchema, getPasswordRequirements } from '@/lib/password-validation';
import { Check, X } from 'lucide-react';

export function UpdatePasswordPage() {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const updateSchema = z.object({
    password: getPasswordSchema(t),
    confirmPassword: z.string(),
  }).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange',
  });

  const password = form.watch('password');
  const requirements = getPasswordRequirements(password || '', t);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // The user is in the password recovery flow
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(values: z.infer<typeof updateSchema>) {
    setError('');
    setMessage('');

    const { error } = await supabase.auth.updateUser({
      password: values.password
    });

    if (error) {
      setError(`Erro: ${error.message}. O link pode ter expirado.`);
    } else {
      setMessage('Senha atualizada com sucesso! Redirecionando para o login...');
      form.reset();
      setTimeout(() => navigate('/auth'), 3000);
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold italic uppercase tracking-tight">Atualizar Senha</CardTitle>
          <CardDescription>
            Defina uma nova senha forte para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                    </FormControl>
                    <div className="mt-3 space-y-2 p-3 bg-muted/20 rounded-lg border border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Requisitos de Segurança:</p>
                      {requirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {req.met ? (
                            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-500/50 shrink-0" />
                          )}
                          <span className={req.met ? "text-green-500/80 font-medium" : "text-muted-foreground"}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 font-bold uppercase tracking-tighter" 
                disabled={form.formState.isSubmitting || !form.formState.isValid}
              >
                {form.formState.isSubmitting ? 'Atualizando...' : 'Confirmar Nova Senha'}
              </Button>
            </form>
          </Form>
          {message && <p className="mt-4 text-center text-green-500 font-medium animate-pulse">{message}</p>}
          {error && <p className="mt-4 text-center text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
