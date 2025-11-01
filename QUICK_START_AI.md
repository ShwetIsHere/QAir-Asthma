# 🎯 Quick Start: AI Weather Analysis

This guide gets your AI feature working in 5 minutes.

## 📋 What You Need

1. **OpenRouter Account** (Free)
2. **API Key** from OpenRouter
3. **5 minutes** of setup time

## 🚀 Quick Setup (3 Steps)

### Step 1: Get Your FREE API Key (2 minutes)

1. Go to: **https://openrouter.ai**
2. Click **"Sign Up"** (use email or Google)
3. After login, go to: **https://openrouter.ai/keys**
4. Click **"Create Key"**
5. **Copy the key** (starts with `sk-or-v1-...`)

### Step 2: Add to Your Project (1 minute)

1. **Copy the example file:**
   ```bash
   copy .env.example .env
   ```

2. **Open `.env` file** and add your key:
   ```env
   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-paste-your-key-here
   ```

3. **Save the file**

### Step 3: Restart Your App (2 minutes)

1. **Stop Expo** (press `Ctrl+C` in terminal)

2. **Start again:**
   ```bash
   npm start
   ```

3. **Reload your app** (press `r` in terminal or shake device)

## ✅ Test It Works

1. Open your app
2. Go to **Map tab** (Dashboard)
3. **Record a trigger** or tap an existing red marker
4. You should see weather details
5. Wait a few seconds
6. Look for **"AI Health Assessment"** with purple background
7. You should see personalized health advice! 🎉

## ❌ Not Working?

### Error: "API key not configured"
→ Check your `.env` file has the correct key name: `EXPO_PUBLIC_OPENROUTER_API_KEY`
→ Restart Expo server

### Error: "API key is invalid"
→ Get a new key from https://openrouter.ai/keys
→ Make sure you copied the full key

### Still having issues?
→ Read the detailed guide: `AI_DEBUGGING_GUIDE.md`

## 📚 What Happens?

When you tap a location on the map:

1. **App fetches weather data** (temperature, humidity, AQI, PM2.5, etc.)
2. **Sends to OpenRouter AI** (FREE Google Gemini 2.0 Flash model)
3. **AI analyzes** the conditions for asthma patients
4. **Shows recommendation** (2-3 sentences) about outdoor activity safety

**Example AI Response:**
> "The current air quality is moderate with an AQI of 75, which may cause slight discomfort for sensitive individuals. The humidity level of 68% could potentially trigger asthma symptoms. Consider limiting prolonged outdoor activities and keeping your inhaler readily available."

## 💡 Tips

- **It's FREE**: Google Gemini 2.0 Flash is completely free via OpenRouter
- **Fast**: Responses come in 2-5 seconds
- **Accurate**: Uses real-time weather data for personalized advice
- **No Limits**: Free tier has generous usage limits

## 🔐 Is It Safe?

- ✅ Your location data is only used for weather analysis
- ✅ No personal health data is sent to OpenRouter
- ✅ OpenRouter doesn't store your queries
- ✅ API key is stored locally on your device

## 📞 Need Help?

- **Setup Guide**: Read `OPENROUTER_SETUP.md`
- **Debugging**: Read `AI_DEBUGGING_GUIDE.md`
- **Issues**: https://github.com/ShwetIsHere/QAir-Asthma/issues

---

**That's it! Enjoy your AI-powered health assistant! 🤖💙**
