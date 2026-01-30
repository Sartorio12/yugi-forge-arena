-- Add label column to news_posts table
ALTER TABLE public.news_posts ADD COLUMN IF NOT EXISTS label text DEFAULT 'Notícia';
