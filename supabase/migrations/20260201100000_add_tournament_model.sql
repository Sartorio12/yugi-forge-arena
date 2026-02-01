-- Add tournament_model column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tournament_model text DEFAULT 'Diário';
