
-- Extend leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS company_size text;

-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','archived')),
  sender_account text,
  daily_limit integer NOT NULL DEFAULT 20,
  working_days text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  working_hours_start text NOT NULL DEFAULT '09:00',
  working_hours_end text NOT NULL DEFAULT '17:00',
  timezone text NOT NULL DEFAULT 'UTC',
  launched_at timestamptz,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS campaigns_user_idx ON public.campaigns(user_id, created_at DESC);

-- Sequence steps
CREATE TABLE IF NOT EXISTS public.sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  type text NOT NULL CHECK (type IN ('visit_profile','connection_request','message')),
  delay_hours integer NOT NULL DEFAULT 24,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, step_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sequence_steps TO authenticated;
GRANT ALL ON public.sequence_steps TO service_role;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sequence steps" ON public.sequence_steps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER sequence_steps_updated_at BEFORE UPDATE ON public.sequence_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS sequence_steps_campaign_idx ON public.sequence_steps(campaign_id, step_order);

-- Campaign leads
CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_step integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','connected','replied','meeting_booked','not_interested','completed','failed')),
  next_action_at timestamptz,
  last_activity_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_leads TO authenticated;
GRANT ALL ON public.campaign_leads TO service_role;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaign leads" ON public.campaign_leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER campaign_leads_updated_at BEFORE UPDATE ON public.campaign_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS campaign_leads_campaign_idx ON public.campaign_leads(campaign_id, status);
CREATE INDEX IF NOT EXISTS campaign_leads_lead_idx ON public.campaign_leads(lead_id);

-- Campaign events
CREATE TABLE IF NOT EXISTS public.campaign_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  step_id uuid REFERENCES public.sequence_steps(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_events TO authenticated;
GRANT ALL ON public.campaign_events TO service_role;
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own campaign events" ON public.campaign_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS campaign_events_campaign_idx ON public.campaign_events(campaign_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS campaign_events_lead_idx ON public.campaign_events(lead_id, occurred_at DESC);
