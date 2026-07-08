
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_leads_user_linkedin
  ON public.leads(user_id, lower(linkedin_url))
  WHERE linkedin_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_leads_user_email
  ON public.leads(user_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_user_created ON public.leads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads USING gin (
  to_tsvector('simple',
    coalesce(full_name,'') || ' ' ||
    coalesce(company,'') || ' ' ||
    coalesce(role,'') || ' ' ||
    coalesce(job_title,'') || ' ' ||
    coalesce(industry,'') || ' ' ||
    coalesce(country,'') || ' ' ||
    coalesce(email,'') || ' ' ||
    coalesce(linkedin_url,'')
  )
);
