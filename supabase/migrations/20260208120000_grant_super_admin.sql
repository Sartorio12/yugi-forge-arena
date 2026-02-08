-- Grant super-admin privileges to specific user for tournament decks management

-- 1. Ensure the user is marked as admin in the profiles table
UPDATE "public"."profiles"
SET "role" = 'admin'
WHERE "id" = '80193776-6790-457c-906d-ed45ea16df9f';

-- 2. Allow specific user to update ANY tournament deck
CREATE POLICY "Allow super admin to update any tournament deck" 
ON "public"."tournament_decks" 
FOR UPDATE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');

-- 3. Allow specific user to update ANY tournament deck snapshot (making them mutable for this user)
CREATE POLICY "Allow super admin to update any snapshot" 
ON "public"."tournament_deck_snapshots" 
FOR UPDATE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');

-- 4. Also allow delete for cleanup if necessary (tournament_decks)
CREATE POLICY "Allow super admin to delete any tournament deck" 
ON "public"."tournament_decks" 
FOR DELETE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');

-- 5. Also allow delete for cleanup if necessary (snapshots)
CREATE POLICY "Allow super admin to delete any snapshot" 
ON "public"."tournament_deck_snapshots" 
FOR DELETE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');