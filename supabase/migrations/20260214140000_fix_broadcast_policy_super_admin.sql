
-- 20260214140000_fix_broadcast_policy_super_admin.sql
-- Update broadcast management policy to include super-admin role

DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.broadcasts;

CREATE POLICY "Admins can manage broadcasts" ON public.broadcasts 
FOR ALL TO public 
USING (
  EXISTS ( 
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'organizer', 'super-admin')
  )
);

DROP POLICY IF EXISTS "Admins can manage stream_partners" ON public.stream_partners;

CREATE POLICY "Admins can manage stream_partners" ON public.stream_partners 
FOR ALL TO public 
USING (
  EXISTS ( 
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'organizer', 'super-admin')
  )
);
