
-- Shared trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- profiles: user identity + linkedin snapshot
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  linkedin_url TEXT,
  headline TEXT,
  about TEXT,
  industry TEXT,
  services TEXT[],
  target_audience TEXT,
  value_proposition TEXT,
  experience_years INT,
  linkedin_connected BOOLEAN NOT NULL DEFAULT false,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- sales_brain: 1 per user
CREATE TABLE public.sales_brain (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tone TEXT NOT NULL DEFAULT 'professional',
  website TEXT,
  portfolio_links TEXT[],
  faqs JSONB DEFAULT '[]'::jsonb,
  custom_instructions TEXT,
  dos TEXT[],
  donts TEXT[],
  messaging_strategy TEXT,
  icp JSONB,
  conversation_rules TEXT,
  reply_strategy TEXT,
  followup_logic TEXT,
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_brain TO authenticated;
GRANT ALL ON public.sales_brain TO service_role;
ALTER TABLE public.sales_brain ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brain" ON public.sales_brain FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_brain_updated BEFORE UPDATE ON public.sales_brain FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- knowledge_docs
CREATE TABLE public.knowledge_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'link', -- link | pdf | doc | testimonial | case_study
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_docs TO authenticated;
GRANT ALL ON public.knowledge_docs TO service_role;
ALTER TABLE public.knowledge_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kb" ON public.knowledge_docs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_kb_user ON public.knowledge_docs(user_id);

-- leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  headline TEXT,
  company TEXT,
  role TEXT,
  industry TEXT,
  linkedin_url TEXT,
  avatar_url TEXT,
  source TEXT NOT NULL DEFAULT 'ai_discovery', -- ai_discovery | manual | csv
  icp_score INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  -- new | qualified | queued | requested | connected | messaged | replied | interested | meeting | won | not_interested | blocked | skipped
  status_reason TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own leads" ON public.leads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_leads_user_status ON public.leads(user_id, status);
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  intent TEXT DEFAULT 'unknown', -- interested | asking | no_response | not_interested | unknown
  ai_summary TEXT,
  last_message_at TIMESTAMPTZ,
  unread BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, lead_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own convos" ON public.conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_convos_updated BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- outbound | inbound
  author TEXT NOT NULL DEFAULT 'ai', -- ai | human | lead
  body TEXT NOT NULL,
  kind TEXT DEFAULT 'chat', -- connection_note | intro | reply | followup | chat
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own messages" ON public.messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_msg_convo ON public.messages(conversation_id, created_at);

-- follow_ups
CREATE TABLE public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  step INT NOT NULL, -- 1..4
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | sent | skipped | cancelled
  body TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follow_ups TO authenticated;
GRANT ALL ON public.follow_ups TO service_role;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own followups" ON public.follow_ups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- meetings
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INT DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed | completed | cancelled | no_show
  notes TEXT,
  meeting_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meetings" ON public.meetings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ai_memory
CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- winning_message | objection | pattern | tone | behavior
  title TEXT NOT NULL,
  detail TEXT,
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_memory TO authenticated;
GRANT ALL ON public.ai_memory TO service_role;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memory" ON public.ai_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- activity_log (dashboard live feed)
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- discovery | connection | message | reply | meeting | learning | system
  title TEXT NOT NULL,
  detail TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_activity_user_time ON public.activity_log(user_id, created_at DESC);
