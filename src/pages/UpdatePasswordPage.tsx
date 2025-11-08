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

const updateSchema = z.object({
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não conferem.",
  path: ["confirmPassword"],
});

export function UpdatePasswordPage() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });
  
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
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Atualizar Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo.
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>
          </Form>
          {message && <p className="mt-4 text-center text-green-500">{message}</p>}
          {error && <p className="mt-4 text-center text-red-500">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
