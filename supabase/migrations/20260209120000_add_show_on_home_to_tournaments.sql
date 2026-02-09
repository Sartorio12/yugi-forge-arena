-- Add show_on_home column to tournaments table
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT true;

-- Ensure all existing tournaments have show_on_home set to true
UPDATE public.tournaments SET show_on_home = true WHERE show_on_home IS NULL;
