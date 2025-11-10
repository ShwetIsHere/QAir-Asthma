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
