-- QAir-Asthma consolidated schema (current app state)
-- Run this script in Supabase SQL editor. Idempotent (IF NOT EXISTS used where possible).

-- Extensions (UUID generation)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================
-- Table: inhaler_triggers
-- ===============================
CREATE TABLE IF NOT EXISTS public.inhaler_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  aqi INTEGER,
  category TEXT,
  pm25 DECIMAL(10, 2),
  pm10 DECIMAL(10, 2),
  temperature DECIMAL(5, 2),
  humidity DECIMAL(5, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inhaler_triggers_user_id ON public.inhaler_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_inhaler_triggers_timestamp ON public.inhaler_triggers(timestamp DESC);

-- RLS
ALTER TABLE public.inhaler_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own triggers"
  ON public.inhaler_triggers FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own triggers"
  ON public.inhaler_triggers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own triggers"
  ON public.inhaler_triggers FOR DELETE
  USING (auth.uid() = user_id);

-- ===============================
-- Table: emergency_contacts (adds push_token)
-- ===============================
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  push_token TEXT, -- Expo push token for alerts (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_is_primary ON public.emergency_contacts(is_primary);

-- RLS
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own emergency contacts"
  ON public.emergency_contacts FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own emergency contacts"
  ON public.emergency_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own emergency contacts"
  ON public.emergency_contacts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own emergency contacts"
  ON public.emergency_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ===============================
-- Table: asthma_action_plan (deduplicated)
-- ===============================
CREATE TABLE IF NOT EXISTS public.asthma_action_plan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  green_zone_actions TEXT,
  yellow_zone_actions TEXT,
  red_zone_actions TEXT,
  medications TEXT,
  doctor_name TEXT,
  doctor_phone TEXT,
  hospital_name TEXT,
  hospital_address TEXT,
  allergies TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asthma_action_plan_user_id ON public.asthma_action_plan(user_id);

-- RLS
ALTER TABLE public.asthma_action_plan ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own action plan"
  ON public.asthma_action_plan FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own action plan"
  ON public.asthma_action_plan FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own action plan"
  ON public.asthma_action_plan FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own action plan"
  ON public.asthma_action_plan FOR DELETE
  USING (auth.uid() = user_id);

-- ===============================
-- Updated-at trigger utility
-- ===============================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_emergency_contacts_updated_at ON public.emergency_contacts;
CREATE TRIGGER trg_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_asthma_action_plan_updated_at ON public.asthma_action_plan;
CREATE TRIGGER trg_asthma_action_plan_updated_at
BEFORE UPDATE ON public.asthma_action_plan
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===============================
-- Table: inhaler_count
-- ===============================
CREATE TABLE IF NOT EXISTS public.inhaler_count (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remaining_doses INTEGER NOT NULL DEFAULT 30,
  total_doses INTEGER NOT NULL DEFAULT 30,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inhaler_count_user_id ON public.inhaler_count(user_id);

-- RLS
ALTER TABLE public.inhaler_count ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can view own inhaler count"
  ON public.inhaler_count FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert own inhaler count"
  ON public.inhaler_count FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update own inhaler count"
  ON public.inhaler_count FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete own inhaler count"
  ON public.inhaler_count FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger
DROP TRIGGER IF EXISTS trg_inhaler_count_updated_at ON public.inhaler_count;
CREATE TRIGGER trg_inhaler_count_updated_at
BEFORE UPDATE ON public.inhaler_count
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===============================
-- Notes
-- 1) Legacy gamification tables (user_challenges, challenge_progress_logs) are intentionally omitted.
--    If they exist and are no longer needed, consider archiving then dropping them manually.
-- 2) This script assumes Expo push tokens are stored per emergency contact (`push_token`).
-- 3) All tables use RLS to scope access by `auth.uid()`.
