# Supabase Database Schema Setup

## Required Tables

### 1. inhaler_triggers table

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

-- Create index for faster queries
CREATE INDEX idx_inhaler_triggers_user_id ON public.inhaler_triggers(user_id);
CREATE INDEX idx_inhaler_triggers_timestamp ON public.inhaler_triggers(timestamp DESC);
CREATE INDEX idx_inhaler_triggers_location ON public.inhaler_triggers(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE public.inhaler_triggers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own triggers"
    ON public.inhaler_triggers
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own triggers"
    ON public.inhaler_triggers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own triggers"
    ON public.inhaler_triggers
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own triggers"
    ON public.inhaler_triggers
    FOR DELETE
    USING (auth.uid() = user_id);
```

### 2. user_profiles table (optional, for extended user info)

```sql
-- Create user_profiles table
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone TEXT,
    emergency_contact TEXT,
    emergency_phone TEXT,
    date_of_birth DATE,
    medical_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
```

### 3. user_settings table

```sql
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

-- Create policies
CREATE POLICY "Users can view their own settings"
    ON public.user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
```

## Setup Instructions

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each SQL block above
4. Execute each block to create the tables and policies
5. Verify the tables are created in the Table Editor

## Environment Variables

Create a `.env` file in your project root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Google Maps API Key

1. Go to Google Cloud Console
2. Enable Maps SDK for Android and iOS
3. Create API credentials
4. Add the API key to your app.json and .env file

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Air Quality API (Optional)

For real air quality data, consider using:

1. **OpenWeatherMap Air Pollution API**
   - URL: https://openweathermap.org/api/air-pollution
   - Free tier available

2. **IQAir API**
   - URL: https://www.iqair.com/air-pollution-data-api
   - Free tier available

3. **AirVisual API**
   - URL: https://www.iqair.com/us/commercial/air-quality-monitors/airvisual-platform/api

Add your chosen API key to `.env`:

```env
EXPO_PUBLIC_AIR_QUALITY_API_KEY=your_api_key
```
