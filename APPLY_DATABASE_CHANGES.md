# How to Apply Database Changes to Supabase

## Error Explanation
The error `"Could not find the table 'public.user_challenges' in the schema cache"` means the new tables haven't been created in your Supabase database yet.

## Solution: Run the SQL Schema

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your QAir project

### Step 2: Open SQL Editor
1. Click on the **SQL Editor** icon in the left sidebar (looks like `</>`)
2. Click **"New query"** button

### Step 3: Copy & Paste the SQL
Copy the entire contents of `supabase_schema.sql` and paste it into the SQL editor.

**OR** you can run just the new tables (lines 128-216):

```sql
-- User Challenges Table
CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  goal_target INTEGER NOT NULL,
  current_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  difficulty TEXT DEFAULT 'medium',
  points INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_end_date ON user_challenges(end_date);

-- Enable RLS
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON user_challenges FOR DELETE USING (auth.uid() = user_id);

-- Challenge Progress Logs Table
CREATE TABLE IF NOT EXISTS challenge_progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress_value INTEGER DEFAULT 1,
  log_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, log_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_challenge_id ON challenge_progress_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_user_id ON challenge_progress_logs(user_id);

-- Enable RLS
ALTER TABLE challenge_progress_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own progress logs"
  ON challenge_progress_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress logs"
  ON challenge_progress_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress logs"
  ON challenge_progress_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress logs"
  ON challenge_progress_logs FOR DELETE USING (auth.uid() = user_id);
```

### Step 4: Run the Query
1. Click the **"Run"** button (or press `Ctrl+Enter` / `Cmd+Enter`)
2. Wait for confirmation message: "Success. No rows returned"

### Step 5: Verify Tables Created
1. Click on **"Table Editor"** in the left sidebar
2. You should see two new tables:
   - `user_challenges`
   - `challenge_progress_logs`

### Step 6: Restart Your App
After the tables are created:
1. Stop your Expo dev server (press `Ctrl+C` in terminal)
2. Clear Metro cache and restart:
   ```cmd
   npx expo start -c
   ```

## Expected Result
✅ No more "table not found" errors
✅ Challenges feature will work properly
✅ You can generate and complete challenges

## Troubleshooting

### If you get "policy already exists" errors:
This is normal if you're re-running the script. The `IF NOT EXISTS` clauses prevent duplicate table creation.

### If RLS policies fail:
Drop and recreate them:
```sql
DROP POLICY IF EXISTS "Users can view own challenges" ON user_challenges;
-- Then re-run the CREATE POLICY commands
```

### Need to start fresh?
```sql
DROP TABLE IF EXISTS challenge_progress_logs CASCADE;
DROP TABLE IF EXISTS user_challenges CASCADE;
-- Then re-run the full CREATE TABLE commands
```
