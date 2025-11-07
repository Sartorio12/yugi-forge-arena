-- Create the 'cards' table
CREATE TABLE public.cards (
    id text PRIMARY KEY,
    name text NOT NULL,
    pt_name text,
    type text NOT NULL,
    description text NOT NULL, -- Renamed from 'desc' to avoid SQL keyword conflict
    race text NOT NULL,
    attribute text,
    atk integer,
    def integer,
    level integer,
    image_url text NOT NULL,
    image_url_small text NOT NULL,
    ban_tcg text,
    ban_ocg text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Create a policy for public read access
CREATE POLICY "Public cards are viewable by everyone." ON public.cards
  FOR SELECT USING (true);

-- Create a function to update 'updated_at' column automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to call the update_updated_at_column function before update
CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
