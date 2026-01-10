-- Create a table to store stream partners (channels to monitor)
CREATE TABLE IF NOT EXISTS public.stream_partners (
    id SERIAL PRIMARY KEY,
    platform TEXT NOT NULL DEFAULT 'twitch' CHECK (platform IN ('twitch', 'youtube')),
    channel_id TEXT NOT NULL UNIQUE, -- The username on Twitch (e.g., 'meuparceiro')
    display_name TEXT, -- Friendly name for internal reference
    priority INTEGER DEFAULT 0, -- Higher number = Higher priority if multiple are live
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.stream_partners ENABLE ROW LEVEL SECURITY;

-- Admins can manage partners
CREATE POLICY "Admins can manage stream_partners"
ON public.stream_partners FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'organizer')
  )
);

-- Public can read
CREATE POLICY "Public can view stream_partners"
ON public.stream_partners FOR SELECT
USING (true);

-- No seed data added. Feed this table via SQL or Admin UI to start monitoring channels.
-- Example:
-- INSERT INTO public.stream_partners (platform, channel_id, display_name, priority)
-- VALUES ('twitch', 'nome_do_canal', 'Nome do Streamer', 10);

-- INSERT INTO public.stream_partners (platform, channel_id, display_name, priority)
-- VALUES ('youtube', 'UCxxxxxxxxxxxxxxxxxxxx', 'Nome do Parceiro YT', 50);

INSERT INTO public.stream_partners (platform, channel_id, display_name, priority)
VALUES 
    ('youtube', 'UCrkky2BRRbrNZblNiiTHuNw', 'DioneMasterYGO', 70),
    ('twitch', 'erys_aguiar', 'Erys Aguiar', 100),
    ('twitch', 'ksnynui', 'ksnynui', 50)
ON CONFLICT (channel_id) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    priority = EXCLUDED.priority,
    platform = EXCLUDED.platform;



