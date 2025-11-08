ALTER TABLE public.tournaments
ADD COLUMN is_decklist_required BOOLEAN NOT NULL DEFAULT TRUE;
