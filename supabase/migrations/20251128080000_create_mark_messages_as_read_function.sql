CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_sender_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.direct_messages
  SET is_read = TRUE
  WHERE sender_id = p_sender_id
    AND receiver_id = auth.uid()
    AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
