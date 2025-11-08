// src/pages/RequestPasswordResetPage.tsx
import { supabase } from '../integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const requestSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});

export function RequestPasswordResetPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: z.infer<typeof requestSchema>) {
    setMessage('');
    setError('');

    const redirectTo = `${window.location.origin}/atualizar-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: redirectTo,
    });

    if (error) {
      setError(`Erro: ${error.message}`);
    } else {
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
      form.reset();
    }
  }

  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Esqueceu sua Senha?</CardTitle>
          <CardDescription>
            Digite seu e-mail para receber um link de recuperação de senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enviando...' : 'Enviar Link de Recuperação'}
              </Button>
            </form>
          </Form>
          {message && <p className="mt-4 text-center text-green-500">{message}</p>}
          {error && <p className="mt-4 text-center text-red-500">{error}</p>}
          <div className="mt-4 text-center">
            <Link to="/auth" className="text-sm text-primary hover:underline">
              Voltar para o Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
