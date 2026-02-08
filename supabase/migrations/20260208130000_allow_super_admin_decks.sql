-- Allow Super Admin to manage ANY deck and deck_cards

-- 1. Decks
CREATE POLICY "Allow super admin to update any deck" 
ON "public"."decks" 
FOR UPDATE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');

CREATE POLICY "Allow super admin to delete any deck" 
ON "public"."decks" 
FOR DELETE 
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');

-- 2. Deck Cards
-- Note: deck_cards often uses a subquery to check ownership via the decks table.
-- We need to ensure the policy allows the super admin to bypass this or specifically allow them.

CREATE POLICY "Allow super admin to manage any deck_cards" 
ON "public"."deck_cards" 
FOR ALL
USING (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f')
WITH CHECK (auth.uid() = '80193776-6790-457c-906d-ed45ea16df9f');
