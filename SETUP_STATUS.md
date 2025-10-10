# QAir Setup Verification

## ✅ Configuration Status

Your environment has been configured with the following credentials:

### 🔐 Supabase Configuration
- **URL**: `https://ptexxdbbyhejbucrztcn.supabase.co`
- **Anon Key**: `eyJhbGc...` (configured ✅)
- **Status**: Ready for use

### 🤖 OpenRouter API
- **API Key**: `sk-or-v1-627d...` (configured ✅)
- **Status**: Ready for use

### 🗺️ Google Maps API
- **Status**: ⚠️ Needs configuration
- **Action Required**: Get API key from [Google Cloud Console](https://console.cloud.google.com/)

### 🌡️ OpenWeatherMap API (Optional)
- **Status**: ⚠️ Optional - app will use mock data
- **Action**: Get API key from [OpenWeatherMap](https://openweathermap.org/api)

---

## 🚀 Next Steps

### 1. Setup Supabase Database (REQUIRED)

Go to your Supabase dashboard and run these SQL commands:

#### Create inhaler_triggers table
```sql
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

CREATE INDEX idx_inhaler_triggers_user_id ON public.inhaler_triggers(user_id);
CREATE INDEX idx_inhaler_triggers_timestamp ON public.inhaler_triggers(timestamp DESC);
CREATE INDEX idx_inhaler_triggers_location ON public.inhaler_triggers(latitude, longitude);

ALTER TABLE public.inhaler_triggers ENABLE ROW LEVEL SECURITY;

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
```

#### Create user_settings table
```sql
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

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

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

### 2. Get Google Maps API Key (REQUIRED)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - **Maps SDK for Android**
   - **Maps SDK for iOS**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key
6. Update `.env` file:
   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_google_maps_key_here
   ```
7. Update `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "config": {
           "googleMaps": {
             "apiKey": "your_actual_google_maps_key_here"
           }
         }
       },
       "ios": {
         "config": {
           "googleMapsApiKey": "your_actual_google_maps_key_here"
         }
       }
     }
   }
   ```

### 3. Run the App

```bash
# Install dependencies (if not done)
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

---

## 🧪 Test Your Setup

### Test Supabase Connection
1. Open the app
2. Try to register a new account
3. Check your email for verification
4. Login with credentials
5. If successful, Supabase is working! ✅

### Test Map Display
1. Login to the app
2. Allow location permissions
3. You should see the map (once Google Maps API key is added)
4. Try the "Record Trigger" button

### Test Database
1. Record a trigger on the map
2. Go to Supabase Dashboard → Table Editor
3. Check `inhaler_triggers` table
4. You should see your record! ✅

---

## ⚠️ Important Security Notes

1. **Never commit your `.env` file** to version control
2. Your `.env` file is already in `.gitignore` ✅
3. Keep your API keys secure and private
4. Rotate keys if they are exposed

---

## 🆘 Troubleshooting

### Issue: "Invalid API key" error
**Solution**: Double-check your Supabase URL and anon key in `.env` file

### Issue: Map not showing
**Solution**: 
- Add Google Maps API key to `.env` and `app.json`
- Enable Maps SDK in Google Cloud Console
- Restart the app: `npm start -- --clear`

### Issue: Location not working
**Solution**:
- Allow location permissions in device settings
- Test on a physical device (simulators may have issues)
- Check `expo-location` is installed

### Issue: Database connection fails
**Solution**:
- Verify tables are created in Supabase
- Check Row Level Security policies are enabled
- Ensure user is authenticated

---

## 📞 Need Help?

- Check `QUICK_START.md` for detailed setup
- Review `SUPABASE_SETUP.md` for database help
- See `LAUNCH_CHECKLIST.md` for testing guide
- Contact: support@qair.com

---

## ✅ Checklist

- [x] Supabase URL configured
- [x] Supabase Anon Key configured
- [x] OpenRouter API key configured
- [ ] Database tables created in Supabase
- [ ] Google Maps API key added
- [ ] App tested and running

**You're almost ready to go! Just add Google Maps API key and create the database tables! 🚀**
