# Quick Start Guide - QAir App

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
cd "f:\Asthma Native\QAir"
npm install
```

### Step 2: Setup Supabase

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Click "New Project"
   - Fill in project details

2. **Create Database Tables**
   - Open SQL Editor in Supabase
   - Copy SQL from `SUPABASE_SETUP.md`
   - Execute the SQL to create tables

3. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy:
     - Project URL
     - Anon/Public key

### Step 3: Setup Google Maps

1. **Get Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable these APIs:
     - Maps SDK for Android
     - Maps SDK for iOS
   - Go to Credentials → Create Credentials → API Key
   - Copy your API key

2. **Update app.json**
   ```json
   {
     "expo": {
       "android": {
         "config": {
           "googleMaps": {
             "apiKey": "YOUR_KEY_HERE"
           }
         }
       },
       "ios": {
         "config": {
           "googleMapsApiKey": "YOUR_KEY_HERE"
         }
       }
     }
   }
   ```

### Step 4: Configure Environment Variables

1. **Create .env file**
   ```bash
   copy .env.example .env
   ```

2. **Update .env with your credentials**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
   EXPO_PUBLIC_OPENWEATHER_API_KEY=optional_weather_api_key
   ```

### Step 5: Run the App

```bash
# Start development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 📱 Testing the App

### Test User Flow

1. **Register a New Account**
   - Open the app
   - Click "Sign Up"
   - Fill in details
   - Check email for verification

2. **Login**
   - Enter credentials
   - Click "Sign In"

3. **Record a Trigger**
   - Allow location permissions
   - Click "Record Trigger" button
   - See marker appear on map

4. **View Details**
   - Tap on any marker
   - See AQI data in bottom sheet

5. **Check Settings**
   - Tap Settings tab
   - Update preferences
   - Test logout

## 🔧 Common Issues

### Issue: Maps not showing

**Solution:**
- Check Google Maps API key in `app.json`
- Ensure Maps SDK is enabled in Google Cloud Console
- Verify API key restrictions (if any)

### Issue: Location not working

**Solution:**
- Check location permissions in device settings
- Ensure `expo-location` is properly installed
- Restart the app

### Issue: Supabase authentication fails

**Solution:**
- Verify Supabase URL and anon key in `.env`
- Check if email confirmation is required
- Look at Supabase dashboard for errors

### Issue: Can't install dependencies

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm cache clean --force
npm install
```

## 🎯 Features to Test

- ✅ User registration and login
- ✅ Google Maps display
- ✅ Current location tracking
- ✅ Recording inhaler triggers
- ✅ Viewing trigger details
- ✅ Red zone calculations (need 5+ triggers in 500m)
- ✅ Settings management
- ✅ Logout functionality

## 📊 Database Verification

Check if tables are created:
1. Go to Supabase Dashboard
2. Click "Table Editor"
3. Should see:
   - `inhaler_triggers`
   - `user_settings`
   - `user_profiles` (optional)

## 🌐 API Keys Setup (Optional)

### OpenWeatherMap (for real air quality data)

1. Sign up at [https://openweathermap.org/api](https://openweathermap.org/api)
2. Get your API key
3. Add to `.env`:
   ```env
   EXPO_PUBLIC_OPENWEATHER_API_KEY=your_key_here
   ```

**Note:** Without OpenWeatherMap key, the app will use mock air quality data.

## 🎨 Customization

### Change App Colors

Edit `tailwind.config.js`:
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#6366F1', // Change to your color
      },
    },
  },
};
```

### Change App Name

Edit `app.json`:
```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug"
  }
}
```

## 📱 Build for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview
```

### iOS IPA

```bash
# Build for iOS
eas build --platform ios --profile preview
```

## 🆘 Need Help?

- Check `README.md` for detailed documentation
- Review `SUPABASE_SETUP.md` for database schema
- Open an issue on GitHub
- Contact support@qair.com

## ✨ Next Steps

1. ✅ Test all features thoroughly
2. 📱 Add push notifications
3. 📊 Create analytics dashboard
4. 🔔 Add medication reminders
5. 📤 Implement data export
6. 🌐 Add multi-language support

---

**Happy Coding! 🚀**
