-- Drop the existing check constraint
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournament_type_check;

-- Add the updated check constraint including 'banimento'
ALTER TABLE public.tournaments 
ADD CONSTRAINT tournament_type_check CHECK (type IN ('standard', 'liga', 'banimento'));
