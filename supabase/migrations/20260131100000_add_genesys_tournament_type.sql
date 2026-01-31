-- Update the check constraint to include 'genesys'
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournament_type_check;

ALTER TABLE tournaments
ADD CONSTRAINT tournament_type_check CHECK (type IN ('standard', 'liga', 'banimento', 'genesys'));
