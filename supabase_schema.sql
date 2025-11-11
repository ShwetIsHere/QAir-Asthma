-- QAir Inhaler Triggers Table
-- Run this in your Supabase SQL Editor if the table doesn't exist

CREATE TABLE IF NOT EXISTS inhaler_triggers (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_inhaler_triggers_user_id ON inhaler_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_inhaler_triggers_timestamp ON inhaler_triggers(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE inhaler_triggers ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own triggers
CREATE POLICY "Users can view own triggers"
  ON inhaler_triggers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own triggers
CREATE POLICY "Users can insert own triggers"
  ON inhaler_triggers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own triggers
CREATE POLICY "Users can delete own triggers"
  ON inhaler_triggers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Emergency Contacts Table
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- Enable Row Level Security
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency_contacts
CREATE POLICY "Users can view own emergency contacts"
  ON emergency_contacts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency contacts"
  ON emergency_contacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts"
  ON emergency_contacts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts"
  ON emergency_contacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Asthma Action Plan Table
CREATE TABLE IF NOT EXISTS asthma_action_plan (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_asthma_action_plan_user_id ON asthma_action_plan(user_id);

-- Enable Row Level Security
ALTER TABLE asthma_action_plan ENABLE ROW LEVEL SECURITY;

-- Create policies for asthma_action_plan
CREATE POLICY "Users can view own action plan"
  ON asthma_action_plan
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action plan"
  ON asthma_action_plan
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action plan"
  ON asthma_action_plan
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action plan"
  ON asthma_action_plan
  FOR DELETE
  USING (auth.uid() = user_id);

  - Asthma Action Plan Table
CREATE TABLE IF NOT EXISTS asthma_action_plan (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_asthma_action_plan_user_id ON asthma_action_plan(user_id);

-- Enable Row Level Security
ALTER TABLE asthma_action_plan ENABLE ROW LEVEL SECURITY;

-- Create policies for asthma_action_plan
CREATE POLICY "Users can view own action plan"
  ON asthma_action_plan
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own action plan"
  ON asthma_action_plan
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own action plan"
  ON asthma_action_plan
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own action plan"
  ON asthma_action_plan
  FOR DELETE
  USING (auth.uid() = user_id);

-- User Challenges Table
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL, -- 'walk_good_air', 'inhaler_technique', 'trigger_tracking', 'streak', etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_target INTEGER NOT NULL, -- e.g., 3 walks, 7 days streak
  current_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'failed', 'expired'
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  points INTEGER DEFAULT 0, -- Points awarded for completion
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ, -- When challenge expires
  completed_date TIMESTAMPTZ,
  metadata JSONB, -- Store additional data like specific days, locations, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_end_date ON user_challenges(end_date);

-- Enable Row Level Security
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for user_challenges
CREATE POLICY "Users can view own challenges"
  ON user_challenges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON user_challenges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON user_challenges
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON user_challenges
  FOR DELETE
  USING (auth.uid() = user_id);

-- Challenge Progress Logs Table (to track daily progress)
CREATE TABLE IF NOT EXISTS challenge_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 1, -- Increment value
  log_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, log_date) -- One log per challenge per day
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_challenge_id ON challenge_progress_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_user_id ON challenge_progress_logs(user_id);

-- Enable Row Level Security
ALTER TABLE challenge_progress_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for challenge_progress_logs
CREATE POLICY "Users can view own progress logs"
  ON challenge_progress_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress logs"
  ON challenge_progress_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress logs"
  ON challenge_progress_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress logs"
  ON challenge_progress_logs
  FOR DELETE
  USING (auth.uid() = user_id);
