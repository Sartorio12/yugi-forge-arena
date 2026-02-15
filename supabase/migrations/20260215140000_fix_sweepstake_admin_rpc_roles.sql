-- Fix get_all_bets_admin to include super-admin role

CREATE OR REPLACE FUNCTION public.get_all_bets_admin(p_sweepstake_id bigint)
 RETURNS TABLE(bet_id bigint, payment_status text, payment_method text, payment_amount numeric, created_at timestamp with time zone, username text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 BEGIN
     -- Check permissions: include super-admin
     IF public.get_user_role() NOT IN ('super-admin', 'admin', 'organizer') THEN
         RAISE EXCEPTION 'Access denied';
     END IF;
 
     RETURN QUERY
     SELECT 
         b.id as bet_id,
         b.payment_status,
         b.payment_method,
         b.payment_amount,
         b.created_at,
         p.username
     FROM public.sweepstake_bets b
     LEFT JOIN public.profiles p ON b.user_id = p.id
     WHERE b.sweepstake_id = p_sweepstake_id
     ORDER BY b.created_at DESC;
 END;
 $function$;
