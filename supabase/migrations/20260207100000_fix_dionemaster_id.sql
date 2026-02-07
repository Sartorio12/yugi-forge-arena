-- Update Dionemaster channel ID to ensure it matches the one provided by user
UPDATE public.stream_partners 
SET channel_id = 'UCrkky2BRRbrNZblNiiTHuNw',
    display_name = 'DioneMasterYGO'
WHERE display_name ILIKE '%Dionemaster%';
