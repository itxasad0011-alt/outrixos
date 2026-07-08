
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS skills text[];

ALTER TABLE public.sales_brain
  ADD COLUMN IF NOT EXISTS positioning text,
  ADD COLUMN IF NOT EXISTS communication_style text,
  ADD COLUMN IF NOT EXISTS outreach_tone text,
  ADD COLUMN IF NOT EXISTS expertise text[],
  ADD COLUMN IF NOT EXISTS skills text[],
  ADD COLUMN IF NOT EXISTS offers text[],
  ADD COLUMN IF NOT EXISTS niche text,
  ADD COLUMN IF NOT EXISTS company_summary text,
  ADD COLUMN IF NOT EXISTS personal_brand_summary text;
