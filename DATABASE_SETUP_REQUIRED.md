# 🔧 Database Setup Required - Quick Fix Guide

## The Issue
Your app is looking for the `user_challenges` table in Supabase, but it doesn't exist yet. The tables need to be created in your Supabase database.

## ⚡ Quick Fix (3 Steps)

### Step 1: Open Supabase SQL Editor
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your QAir project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New query"**

### Step 2: Copy & Run This SQL
**Use the clean SQL file I created for you:**

Open `challenges_tables_only.sql` and copy the entire contents, then paste into Supabase SQL Editor.

**OR** copy this complete SQL below:

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

CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_end_date ON user_challenges(end_date);

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON user_challenges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own challenges" ON user_challenges FOR DELETE USING (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_challenge_id ON challenge_progress_logs(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_logs_user_id ON challenge_progress_logs(user_id);

ALTER TABLE challenge_progress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress logs" ON challenge_progress_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress logs" ON challenge_progress_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress logs" ON challenge_progress_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress logs" ON challenge_progress_logs FOR DELETE USING (auth.uid() = user_id);
```

Click **"Run"** (or press `Ctrl+Enter`)

### Step 3: Restart Your App
```cmd
# Stop the current server (Ctrl+C)
# Then restart with cache clear:
npx expo start -c
```

## ✅ Verify It Worked

### Option 1: Use the verification script
```cmd
node check_challenges_db.js
```

### Option 2: Check manually in Supabase
1. Go to **Table Editor** in Supabase Dashboard
2. You should see:
   - ✅ `user_challenges` table
   - ✅ `challenge_progress_logs` table

### Option 3: Test in the app
1. Open your app
2. Go to **Profile** tab
3. Scroll to **"Your Challenges"** section
4. Tap **"Generate New Challenges"**
5. You should see 4 new challenges appear!

## 🎯 What Changed

I fixed a field name mismatch in `ChallengesManager.tsx`:
- Changed `progress_date` → `log_date` (to match SQL schema)
- Changed `progress_amount` → `progress_value` (to match SQL schema)

## 📝 Need More Help?

See the detailed guide: **APPLY_DATABASE_CHANGES.md**

## 🐛 Still Getting Errors?

If you still see "table not found" errors:
1. Make sure you ran the SQL in the **correct Supabase project**
2. Check that you're using the correct environment variables (`.env` file)
3. Verify your Supabase URL and anon key are correct
4. Try clearing Metro cache: `npx expo start -c`

---

**Next Step**: Run the SQL in Supabase, then restart your app! 🚀
