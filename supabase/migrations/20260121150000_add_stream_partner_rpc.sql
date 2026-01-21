CREATE OR REPLACE FUNCTION insert_stream_partner(
  p_platform text,
  p_channel_id text,
  p_display_name text,
  p_priority int DEFAULT 0,
  p_is_enabled boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.stream_partners (platform, channel_id, display_name, priority, is_enabled)
  VALUES (p_platform, p_channel_id, p_display_name, p_priority, p_is_enabled);
END;
$$;
