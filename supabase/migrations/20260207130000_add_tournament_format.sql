-- 1. Add 'format' column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'single_elimination';

-- 2. Add constraint for valid formats
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_format_check 
CHECK (format IN ('single_elimination', 'swiss', 'groups'));

-- 3. Cleanup: Remove the temporary 'grupos' type from the type constraint if it was added
ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_type_check;
ALTER TABLE public.tournaments ADD CONSTRAINT tournaments_type_check 
CHECK (type IN ('standard', 'liga', 'banimento', 'genesys'));