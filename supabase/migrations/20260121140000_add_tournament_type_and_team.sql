ALTER TABLE tournaments
ADD COLUMN type text NOT NULL DEFAULT 'standard';

ALTER TABLE tournament_participants
ADD COLUMN team_selection text;

-- Add check constraint for tournament type
ALTER TABLE tournaments
ADD CONSTRAINT tournament_type_check CHECK (type IN ('standard', 'liga'));
