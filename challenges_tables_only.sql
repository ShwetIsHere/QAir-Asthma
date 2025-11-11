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
