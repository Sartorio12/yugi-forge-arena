-- Create tier_list table to store meta snapshot
CREATE TABLE IF NOT EXISTS public.tier_list (
    id SERIAL PRIMARY KEY,
    deck_name TEXT NOT NULL,
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
    power_score DECIMAL, -- Optional, if we can parse it
    image_url TEXT, -- URL to the deck image
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(deck_name, tier) -- Avoid duplicates for the same deck in the same tier (though a deck usually has one tier)
);

-- RLS Policies
ALTER TABLE public.tier_list ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on tier_list"
ON public.tier_list
FOR SELECT
TO public
USING (true);

-- Allow service_role (and admins) to insert/update/delete
-- Assuming service_role bypasses RLS, but explicit policy for admin users if needed:
CREATE POLICY "Allow admin full access on tier_list"
ON public.tier_list
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'organizer')
    )
);
