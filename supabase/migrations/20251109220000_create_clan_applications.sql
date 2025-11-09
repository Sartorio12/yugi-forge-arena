-- 1. Create a custom type for application status
CREATE TYPE public.application_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- 2. Create the clan_applications table
CREATE TABLE public.clan_applications (
    id SERIAL PRIMARY KEY,
    clan_id INT NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.application_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- A user can only apply to a clan once if their application is pending
    CONSTRAINT user_clan_application_unique UNIQUE (user_id, clan_id)
);

-- 3. Enable RLS
ALTER TABLE public.clan_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can create their own applications."
    ON public.clan_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own applications."
    ON public.clan_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Clan leaders can view applications to their clan."
    ON public.clan_applications FOR SELECT
    USING (
        (
            SELECT owner_id
            FROM public.clans
            WHERE id = clan_id
        ) = auth.uid()
    );

CREATE POLICY "Clan leaders can update applications to their clan."
    ON public.clan_applications FOR UPDATE
    USING (
        (
            SELECT owner_id
            FROM public.clans
            WHERE id = clan_id
        ) = auth.uid()
    );
