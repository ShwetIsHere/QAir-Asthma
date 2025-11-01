# OpenRouter AI Integration Setup Guide

## 🤖 About the AI Feature

QAir uses **OpenRouter API** with the **FREE Google Gemini 2.0 Flash** model to provide:
- Real-time health assessments based on weather conditions
- Personalized recommendations for asthma patients
- Location suitability analysis for outdoor activities

## 📋 Setup Instructions

### Step 1: Get Your FREE OpenRouter API Key

1. **Visit OpenRouter**: Go to [https://openrouter.ai](https://openrouter.ai)

2. **Create an Account**: 
   - Click "Sign Up" or "Get Started"
   - Sign up with your email or Google account
   - Verify your email if required

3. **Get Your API Key**:
   - After logging in, go to [https://openrouter.ai/keys](https://openrouter.ai/keys)
   - Click "Create Key" or similar button
   - Copy your API key (it starts with `sk-or-v1-...`)
   - **Important**: Save this key securely - you won't be able to see it again!

### Step 2: Add API Key to Your Project

1. **Copy the example environment file**:
   ```bash
   copy .env.example .env
   ```

2. **Edit the `.env` file** and add your OpenRouter API key:
   ```env
   EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
   ```

3. **Restart your Expo development server**:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then start again
   npm start
   ```

### Step 3: Verify It's Working

1. **Open the app** on your device/emulator
2. **Go to the Map screen** (Dashboard tab)
3. **Record a trigger** or click on an existing marker
4. **View the weather details** - you should see "AI Health Assessment" section
5. **Wait a few seconds** for the AI analysis to load

## ✅ Success Indicators

If everything is working correctly, you should see:
- ✨ **"Analyzing with AI..."** message (briefly)
- 🤖 **"AI Health Assessment"** section with purple background
- 📝 A paragraph with personalized health advice based on current weather

## ❌ Troubleshooting

### Error: "OpenRouter API key not configured"
- **Solution**: Make sure you added the API key to your `.env` file
- **Check**: The key should start with `sk-or-v1-`
- **Action**: Restart your Expo development server after adding the key

### Error: "OpenRouter API key is invalid or expired"
- **Solution**: Your API key might be wrong or revoked
- **Action**: Go to [https://openrouter.ai/keys](https://openrouter.ai/keys) and create a new key

### Error: "OpenRouter account has insufficient credits"
- **Cause**: The free tier has usage limits
- **Solution**: Wait a bit and try again, or check your OpenRouter dashboard
- **Note**: The FREE Gemini 2.0 Flash model should have generous limits

### Error: "Network error" or "Request timeout"
- **Solution**: Check your internet connection
- **Action**: Make sure your device/emulator can access the internet
- **Try**: Use a VPN if OpenRouter is blocked in your region

### AI Analysis Not Showing
- **Check**: Look at the Metro bundler console for error messages
- **Verify**: Your `.env` file has `EXPO_PUBLIC_OPENROUTER_API_KEY` (not just `OPENROUTER_API_KEY`)
- **Action**: Make sure you restarted the Expo server after adding the key

## 🔍 Testing the API Key Manually

You can test your OpenRouter API key using this curl command:

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "google/gemini-2.0-flash-exp:free",
    "messages": [
      {
        "role": "user",
        "content": "Say hello!"
      }
    ]
  }'
```

Replace `YOUR_API_KEY_HERE` with your actual API key.

**Expected Response**: You should get a JSON response with a "hello" message.

## 💡 Additional Notes

### Free Tier Limits
- The FREE Google Gemini 2.0 Flash model is provided by OpenRouter
- There may be rate limits (requests per minute/day)
- For production apps, consider upgrading or monitoring usage

### Model Information
- **Model**: `google/gemini-2.0-flash-exp:free`
- **Provider**: Google (via OpenRouter)
- **Cost**: FREE
- **Speed**: Very fast responses
- **Quality**: Excellent for health recommendations

### Privacy & Data
- Your weather data is sent to OpenRouter for analysis
- No personal health data is stored by OpenRouter
- Refer to [OpenRouter's Privacy Policy](https://openrouter.ai/privacy)

## 📚 Useful Links

- **OpenRouter Dashboard**: [https://openrouter.ai](https://openrouter.ai)
- **API Keys Management**: [https://openrouter.ai/keys](https://openrouter.ai/keys)
- **API Documentation**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **Models List**: [https://openrouter.ai/models](https://openrouter.ai/models)
- **Usage Dashboard**: [https://openrouter.ai/activity](https://openrouter.ai/activity)

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check the Console Logs**: 
   - Look at the Metro bundler terminal
   - Check for detailed error messages

2. **Verify Environment Variables**:
   ```bash
   # In your terminal (while the app is running)
   echo $EXPO_PUBLIC_OPENROUTER_API_KEY
   ```

3. **Test with a Simple Request**:
   - Try the curl command above
   - If that works, the issue is in the app configuration

4. **Contact Support**:
   - OpenRouter Support: Check their documentation
   - QAir App: Open an issue on GitHub

---

**Made with ❤️ for better asthma management**
