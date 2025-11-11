-- This migration adds the 'max_participants' column to the 'tournaments' table.

-- Add max_participants column
ALTER TABLE "public"."tournaments" ADD COLUMN "max_participants" INTEGER;

-- Optional: Add a default value or NOT NULL constraint if desired.
-- For now, it's nullable.
