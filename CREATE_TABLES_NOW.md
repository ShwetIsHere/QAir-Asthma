# 🚨 IMPORTANT: Create Database Tables NOW!

## ❌ Error You're Seeing:
```
"Could not find the table 'public.inhaler_triggers' in the schema cache"
```

## ✅ Solution: Create the Tables in Supabase

### Step 1: Go to Supabase SQL Editor
Open this link in your browser:
```
https://ptexxdbbyhejbucrztcn.supabase.co/project/_/sql/new
```

### Step 2: Copy and Paste This SQL

```sql
-- Create inhaler_triggers table
CREATE TABLE public.inhaler_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    aqi INTEGER,
    category TEXT,
    pm25 DOUBLE PRECISION,
    pm10 DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_inhaler_triggers_user_id ON public.inhaler_triggers(user_id);
CREATE INDEX idx_inhaler_triggers_timestamp ON public.inhaler_triggers(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.inhaler_triggers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own triggers" 
    ON public.inhaler_triggers FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own triggers" 
    ON public.inhaler_triggers FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own triggers" 
    ON public.inhaler_triggers FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own triggers" 
    ON public.inhaler_triggers FOR DELETE 
    USING (auth.uid() = user_id);

-- Create user_settings table
CREATE TABLE public.user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    notifications_enabled BOOLEAN DEFAULT true,
    location_tracking_enabled BOOLEAN DEFAULT true,
    dark_mode_enabled BOOLEAN DEFAULT false,
    aqi_alert_threshold INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own settings" 
    ON public.user_settings FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
    ON public.user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
    ON public.user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
```

### Step 3: Click "RUN" Button ▶️

### Step 4: Verify Tables Were Created
1. Go to **Table Editor** in Supabase
2. You should see:
   - ✅ `inhaler_triggers` table
   - ✅ `user_settings` table

### Step 5: Refresh Your App
In the terminal where the app is running, press:
```
r (reload)
```

Or stop (Ctrl+C) and restart:
```
npm start
```

---

## 🎯 After Creating Tables, You Can:

1. ✅ **Register** a new account
2. ✅ **Login** successfully
3. ✅ **View the map** (needs Android emulator)
4. ✅ **Record triggers** on the map
5. ✅ **See air quality data**
6. ✅ **View red zones**

---

## ⏱️ Takes Only 2 Minutes!

1. Open link: https://ptexxdbbyhejbucrztcn.supabase.co/project/_/sql/new
2. Paste SQL above
3. Click RUN
4. Done! 🎉

---

## 🐛 Still Having Issues?

### Check if tables exist:
1. Go to Supabase Dashboard
2. Click **Table Editor**
3. Look for `inhaler_triggers` and `user_settings`

### Check if RLS is enabled:
1. Click on a table
2. Look for 🔒 icon (means RLS is enabled)

### Restart your app:
```bash
# Press Ctrl+C to stop
# Then:
npm start
```

---

**This is the LAST STEP before your app fully works! 🚀**
