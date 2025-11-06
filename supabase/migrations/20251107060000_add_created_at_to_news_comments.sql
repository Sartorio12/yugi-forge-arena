-- =================================================================
--  CRITICAL HOTFIX 4: Add Missing 'created_at' Column to 'news_comments'
-- =================================================================

-- Add the 'created_at' column to the public.news_comments table.
-- This column is essential for ordering comments and is expected by the frontend.
ALTER TABLE public.news_comments
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
