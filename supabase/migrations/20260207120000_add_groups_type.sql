-- Update the tournament type constraint to allow 'grupos'
-- First, we need to know the name of the constraint. Usually it's tournaments_type_check
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;

ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_type_check 
CHECK (type IN ('standard', 'liga', 'banimento', 'genesys', 'grupos'));
