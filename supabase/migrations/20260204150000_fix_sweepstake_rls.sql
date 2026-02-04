-- Fix RLS for Sweepstake Bets to ensure Admins can see them
-- Using get_user_role() prevents recursion and RLS issues

DROP POLICY IF EXISTS "Admins see all bets" ON public.sweepstake_bets;

CREATE POLICY "Admins see all bets" ON public.sweepstake_bets
FOR SELECT
USING (
  public.get_user_role() IN ('admin', 'organizer')
);

-- Ensure Admins can read ALL profiles (needed to display username/email in the dashboard)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING (
  public.get_user_role() IN ('admin', 'organizer')
);

-- Fix UPDATE policy for Admins to confirm payments
DROP POLICY IF EXISTS "Admins update bets" ON public.sweepstake_bets;

CREATE POLICY "Admins update bets" ON public.sweepstake_bets
FOR UPDATE
USING (
  public.get_user_role() IN ('admin', 'organizer')
);
