# 🗺️ Google Maps API Key Setup Guide

## Quick Setup (5 Minutes)

### Step 1: Go to Google Cloud Console
Open this URL: https://console.cloud.google.com/

### Step 2: Create or Select Project
1. Click on the project dropdown (top left)
2. Click **"New Project"**
3. Enter project name: `QAir-App` (or any name)
4. Click **"Create"**
5. Wait for project creation (~30 seconds)

### Step 3: Enable Required APIs
1. In the search bar, type: **"Maps SDK for Android"**
2. Click on it and press **"Enable"**
3. Wait for it to enable
4. Go back and search: **"Maps SDK for iOS"**
5. Click on it and press **"Enable"**

### Step 4: Create API Key
1. In the left sidebar, click **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"API Key"**
4. Your API key will be generated!
5. **Copy the API key** (looks like: `AIzaSyD...`)

### Step 5: Configure Your App

#### Option A: Add to .env file
1. Open `f:\Asthma Native\QAir\.env`
2. Find this line:
   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
   ```
3. Replace with your actual key:
   ```env
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD...your_actual_key
   ```

#### Option B: Add to app.json
1. Open `f:\Asthma Native\QAir\app.json`
2. Find the Android section (around line 32):
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
       }
     }
   }
   ```
3. Replace with your key:
   ```json
   "android": {
     "config": {
       "googleMaps": {
         "apiKey": "AIzaSyD...your_actual_key"
       }
     }
   }
   ```

4. Find the iOS section (around line 40):
   ```json
   "ios": {
     "config": {
       "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
     }
   }
   ```
5. Replace with your key:
   ```json
   "ios": {
     "config": {
       "googleMapsApiKey": "AIzaSyD...your_actual_key"
     }
   }
   ```

### Step 6: Restart Your App
```bash
# Stop the current server (Ctrl+C)
# Restart with cache clear
npm start -- --clear
```

---

## 🔒 Optional: Secure Your API Key

### Add Application Restrictions (Recommended for Production)

1. Go back to **Credentials** in Google Cloud Console
2. Click on your API key name
3. Under **"Application restrictions"**, select:
   - For Android: **"Android apps"**
     - Add package name: `com.qair.app`
     - Add SHA-1 certificate fingerprint (from your keystore)
   - For iOS: **"iOS apps"**
     - Add bundle ID: `com.qair.app`

4. Under **"API restrictions"**, select:
   - **"Restrict key"**
   - Check only:
     - ✅ Maps SDK for Android
     - ✅ Maps SDK for iOS

5. Click **"Save"**

---

## ✅ Verify Your Setup

### Test on Android:
```bash
npm run android
```
- Map should display ✅
- Current location marker should appear ✅
- Should be able to zoom/pan ✅

### Test on iOS:
```bash
npm run ios
```
- Map should display ✅
- Current location marker should appear ✅
- Should be able to zoom/pan ✅

---

## 🐛 Troubleshooting

### Issue: "Map not showing" or blank screen

**Solution 1**: Check API key is correct
```bash
# Open .env and verify the key starts with: AIza
```

**Solution 2**: Clear cache and restart
```bash
npm start -- --clear
```

**Solution 3**: Verify APIs are enabled
- Go to Google Cloud Console
- Search "Maps SDK for Android"
- Should show "Enabled" (not "Enable")
- Same for "Maps SDK for iOS"

**Solution 4**: Check for typos
- Ensure no extra spaces in the API key
- Key should be one continuous string

### Issue: "Authorization failure"

**Solution**: 
1. Go to Google Cloud Console → Credentials
2. Click on your API key
3. Scroll to **"API restrictions"**
4. Make sure Maps SDK for Android and iOS are in the allowed list
5. If restricted by application, temporarily set to "None" for testing

### Issue: "This API project is not authorized"

**Solution**:
1. You may need to enable billing (Google requires it)
2. Google Maps has a **generous free tier**:
   - $200 free credit per month
   - Covers ~28,000 map loads per month
3. Add a billing account in Google Cloud Console

---

## 💰 Pricing Info

### Google Maps Free Tier:
- ✅ **$200 free credit every month**
- ✅ No charges until you exceed $200
- ✅ Dynamic Maps: $7 per 1,000 loads
- ✅ Free tier = ~28,500 map loads/month

### For QAir App Usage:
- Each time a user opens the map = 1 load
- Average app with 100 daily active users:
  - ~3,000 loads/month
  - **Cost: $0** (within free tier!)

---

## 📝 Quick Reference

### Where to Get Your API Key:
```
https://console.cloud.google.com/
→ APIs & Services
→ Credentials
→ Create Credentials
→ API Key
```

### Where to Add Your API Key:
```
1. .env file (line 7)
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key

2. app.json (line 32 and 40)
   "googleMapsApiKey": "your_key"
```

### How to Test:
```bash
npm start -- --clear
```

---

## ✨ You're Done!

Once you've added your Google Maps API key:
- ✅ Map will display in the app
- ✅ User location will show
- ✅ Can record triggers on map
- ✅ Red zones will appear
- ✅ Markers will be interactive

**Next**: Create database tables using `SUPABASE_SETUP.md`

---

**Need more help?** Check `CONFIGURATION_STATUS.md` or `QUICK_START.md`
