# QAir - Quick Start Guide

This guide will help you get QAir up and running quickly.

## Prerequisites

- Node.js 18+ installed
- Expo CLI: `npm install -g expo-cli`
- Supabase account (free tier works)
- Android Studio (for Android) or Xcode (for iOS)
- ESP32 device with QAir firmware (optional for testing)

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd QAir

# Install dependencies
npm install
```

## Step 2: Supabase Setup

### Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details
4. Wait for project to initialize

### Get Project Credentials

From your Supabase project dashboard:
1. Go to Settings → API
2. Copy:
   - `Project URL` (SUPABASE_URL)
   - `anon public` key (SUPABASE_ANON_KEY)

### Setup Database

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

Or manually run the migration:
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/migrations/001_complete_schema.sql`
3. Run the SQL

## Step 3: Get API Keys

### OpenWeather API
1. Go to [https://openweathermap.org/api](https://openweathermap.org/api)
2. Sign up for free account
3. Get API key from dashboard

### Gemini AI (Google)
1. Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy the key

### Metro Weather API (Optional)
Replace with your preferred AQI data provider if needed.

## Step 4: Configure Environment

Create `.env` in project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 5: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy process-trigger
supabase functions deploy aggregate-weather
supabase functions deploy analyze-risk
supabase functions deploy aggregate-dashboard

# Set secrets
supabase secrets set OPENWEATHER_API_KEY=your_key
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set METRO_WEATHER_API_KEY=your_key
```

## Step 6: Run the App

### Android

```bash
# Build and run
npm run android

# Or just start Metro bundler
npm start
# Then press 'a' for Android
```

### iOS

```bash
# Install pods (first time)
cd ios && pod install && cd ..

# Build and run
npm run ios

# Or start Metro and press 'i'
npm start
```

### Web (Limited Features)

```bash
npm run web
```

## Step 7: Test the Setup

### Test BLE Connection (if you have ESP32)

1. Upload firmware from `arduino/ESP32_FSR_BLE_Inhaler/`
2. Power on ESP32
3. In QAir app, tap "Connect Device"
4. Select your ESP32 from scan results

### Test Without Hardware

The app will work without ESP32:
- Explore the UI
- View sample data
- Test sync features
- Check alert system

## Troubleshooting

### BLE Not Working

**Android:**
- Enable Bluetooth
- Grant location permissions (required for BLE scan)
- Enable "Nearby devices" permission (Android 12+)

**iOS:**
- Add Bluetooth usage description in `Info.plist`
- Grant Bluetooth permission when prompted

### Database Connection Failed

- Check internet connection
- Verify Supabase project is active
- Check environment variables in `.env`
- Ensure RLS policies are enabled

### Edge Functions Not Working

```bash
# Check function logs
supabase functions logs process-trigger

# Redeploy
supabase functions deploy process-trigger --no-verify-jwt
```

### SQLite Errors

```bash
# Clear app data (Android)
adb uninstall com.qair.app
npm run android

# Or clear app storage from device settings
```

## Next Steps

1. **Customize UI**: Edit screens in `app/` folder
2. **Add Features**: Extend services in `client/` layer
3. **Configure Alerts**: Adjust thresholds in Edge Functions
4. **Test Thoroughly**: Use provided test utilities

## Development Workflow

```bash
# Start development server
npm start

# Run linter
npm run lint

# Format code
npm run format

# View logs
npx react-native log-android
npx react-native log-ios
```

## Production Checklist

- [ ] Change all API keys
- [ ] Enable RLS on all tables
- [ ] Set up proper authentication
- [ ] Configure backup strategy
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Test offline functionality
- [ ] Optimize performance
- [ ] Enable push notifications
- [ ] Set up CI/CD pipeline
- [ ] Create privacy policy
- [ ] Submit to app stores

## Resources

- **Architecture**: See `ARCHITECTURE.md`
- **API Docs**: See `docs/API.md` (if available)
- **Hardware Setup**: See `arduino/README.md`
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Expo Docs**: [https://docs.expo.dev](https://docs.expo.dev)

## Support

If you encounter issues:
1. Check the logs (`console.log` outputs)
2. Review Edge Function logs in Supabase
3. Check GitHub Issues
4. Contact support: [your-email]

## License

[Your License]

---

**Happy Coding! 🎉**
