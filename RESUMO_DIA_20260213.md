# Relatório de Atividades - 13/02/2026

## 🚀 Infraestrutura
- **Domínio Oficial:** `staffygo.com.br` configurado e ativo.
- **API Gateway:** `api.staffygo.com.br` rodando via Cloudflare Tunnel no servidor local.
- **Vercel:** Frontend sincronizado com o servidor local (Porta 8000 via Túnel).

## 🗄️ Banco de Dados
- **Clonagem Perfeita:** Migração total dos schemas `public`, `auth` e `storage`.
- **Ranking:** View de rankings corrigida para usar a fórmula oficial (`tournament_participants`).
- **Logins:** Tabela `auth.users` sincronizada, permitindo acesso com senhas originais.
- **Porta Local:** Banco configurado na porta `5435` para evitar conflitos.

## ⚡ Performance e Egress
- **Imagens:** Implementado utilitário de otimização (WebP + Resize).
- **Cache:** Configurado cache agressivo na Cloudflare para zerar custo de tráfego de imagens.
- **CORS:** Liberado acesso para os domínios do projeto no servidor local.

## 📧 E-mail e Autenticação
- **Resend:** Configurado como provedor SMTP oficial.
- **Domínio Verificado:** `staffygo.com.br` autenticado para envio de e-mails de sistema.
- **URLs de Sistema:** Atualizadas para apontar para o domínio real em vez de localhost.

## 🛠️ Scripts Úteis (na pasta /scripts)
- `clone-db.py`: Faz o espelhamento total do Cloud para o Local.
- `sync-api.js`: Sincroniza dados via API REST.
- `extract-permissions.py`: Replica políticas de RLS.
