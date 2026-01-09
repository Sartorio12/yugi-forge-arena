-- Create table for broadcast/livestream configuration
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id SERIAL PRIMARY KEY,
    is_active BOOLEAN DEFAULT false,
    platform TEXT NOT NULL CHECK (platform IN ('twitch', 'youtube')),
    channel_id TEXT NOT NULL, -- "channel name" for twitch, "video id" for youtube
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "Public can view broadcasts"
ON public.broadcasts FOR SELECT
USING (true);

-- Only admins can update (using existing profile role check pattern)
CREATE POLICY "Admins can manage broadcasts"
ON public.broadcasts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizer')
  )
);

-- Insert a default row to be managed
INSERT INTO public.broadcasts (id, is_active, platform, channel_id, title)
VALUES (1, false, 'twitch', 'officialyugioh', 'Transmissão Oficial')
ON CONFLICT (id) DO NOTHING;
