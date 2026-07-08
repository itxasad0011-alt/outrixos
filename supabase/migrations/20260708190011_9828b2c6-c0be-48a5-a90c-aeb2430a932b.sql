ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS favorite boolean NOT NULL DEFAULT false;