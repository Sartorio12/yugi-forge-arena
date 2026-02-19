-- Add banner_offset_y to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_offset_y integer DEFAULT 0;
