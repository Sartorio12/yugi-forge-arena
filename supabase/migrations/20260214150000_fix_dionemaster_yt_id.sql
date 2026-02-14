
-- 20260214150000_fix_dionemaster_yt_id.sql
-- Fix Dionemaster YouTube Channel ID to use the official UC... ID instead of the handle

-- Update the partner entry
UPDATE public.stream_partners
SET channel_id = 'UCrkky2BRRbrNZblNiiTHuNw'
WHERE channel_id = 'dionefernandesmaster';

-- Also update the current active broadcast if it's using the old handle
UPDATE public.broadcasts
SET channel_id = 'UCrkky2BRRbrNZblNiiTHuNw'
WHERE channel_id = 'dionefernandesmaster' AND platform = 'youtube';
