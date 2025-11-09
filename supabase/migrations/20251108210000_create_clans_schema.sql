-- 1. Create a custom type for clan roles
CREATE TYPE public.clan_role AS ENUM ('LEADER', 'MEMBER');

-- 2. Create the clans table
CREATE TABLE public.clans (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    icon_url TEXT,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create the clan_members junction table
CREATE TABLE public.clan_members (
    id SERIAL PRIMARY KEY,
    clan_id INT NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role public.clan_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user can only be a member of one clan at a time
    CONSTRAINT user_clan_unique UNIQUE (user_id),
    -- A user cannot be listed in the same clan twice
    CONSTRAINT clan_user_membership_unique UNIQUE (clan_id, user_id)
);

-- Enable RLS for the new tables
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clan_members ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies (can be refined later)
CREATE POLICY "Clans are viewable by everyone."
    ON public.clans FOR SELECT
    USING (true);

CREATE POLICY "Clan members are viewable by everyone."
    ON public.clan_members FOR SELECT
    USING (true);

CREATE POLICY "Users can create clans."
    ON public.clans FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Clan owners can update their own clan."
    ON public.clans FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Clan owners can delete their own clan."
    ON public.clans FOR DELETE
    USING (auth.uid() = owner_id);
