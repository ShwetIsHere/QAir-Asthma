# 🔍 AI Feature Debugging Checklist

Use this checklist to diagnose issues with the AI health analysis feature.

## ✅ Pre-flight Checklist

### 1. Environment Variables
- [ ] I have a `.env` file in the project root
- [ ] The `.env` file contains `EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-...`
- [ ] The API key starts with `sk-or-v1-`
- [ ] I have restarted the Expo development server after adding the key

### 2. API Key Verification
- [ ] I got the API key from https://openrouter.ai/keys
- [ ] The API key is valid and not expired
- [ ] I can access OpenRouter.ai from my network (not blocked)

### 3. App Configuration
- [ ] The app is running without other errors
- [ ] I can see the map and weather data
- [ ] Internet connection is working on the device/emulator

## 🧪 Testing Steps

### Step 1: Check Console Logs
When you click on a map marker, look for these messages in the Metro bundler console:

**✅ Expected (Success):**
```
Loading AI analysis for location...
Making OpenRouter API request with Gemini 2.0 Flash (FREE)...
API Key present: sk-or-v1-...
Sending request to OpenRouter AI...
OpenRouter response received
AI analysis received successfully
```

**❌ If you see:**
```
OpenRouter API key is missing!
```
→ Your API key is not loaded. Check your `.env` file and restart the server.

```
Error: OpenRouter API key is invalid or expired
```
→ Your API key is wrong. Get a new one from OpenRouter.

```
Error: Network error
```
→ Check your internet connection or VPN settings.

### Step 2: Verify Environment Variables
Add this code temporarily to `app/trigger-details.tsx` at the top:

```typescript
import { debugEnvVars } from '@/utils/debugEnv';

// Inside the component, after useState declarations:
useEffect(() => {
  const envStatus = debugEnvVars();
  console.log('Environment Status:', envStatus);
}, []);
```

Check the console for:
```
=== ENVIRONMENT VARIABLES DEBUG ===
OpenRouter API Key: sk-or-v1-abcd... (95 chars)
===================================
Environment Status: { hasOpenRouterKey: true, openRouterKeyLength: 95 }
```

### Step 3: Test API Key Directly
Run this in your terminal (replace with your actual key):

```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-or-v1-YOUR-KEY-HERE" \
  -d '{
    "model": "google/gemini-2.0-flash-exp:free",
    "messages": [{"role": "user", "content": "Say hi"}]
  }'
```

**Expected Response:**
```json
{
  "choices": [
    {
      "message": {
        "content": "Hi! 👋 ..."
      }
    }
  ]
}
```

## 🐛 Common Issues & Solutions

### Issue 1: "API key not configured"
**Symptoms:**
- Alert shows "OpenRouter API key not configured"
- Console shows "OpenRouter API key is missing!"

**Solutions:**
1. Check if `.env` file exists in project root
2. Verify the key name is exactly `EXPO_PUBLIC_OPENROUTER_API_KEY`
3. Make sure there's no space around the `=` sign
4. Restart Expo with: `npm start --reset-cache`

**Example correct format:**
```env
EXPO_PUBLIC_OPENROUTER_API_KEY=sk-or-v1-abcdefghijklmnop1234567890
```

### Issue 2: "API key is invalid"
**Symptoms:**
- Alert shows "OpenRouter API key is invalid or expired"
- Console shows 401 error

**Solutions:**
1. Go to https://openrouter.ai/keys
2. Create a new API key
3. Replace the old key in `.env`
4. Restart the Expo server

### Issue 3: "Network error"
**Symptoms:**
- Alert shows "Network error"
- Console shows "ENOTFOUND" or "timeout"

**Solutions:**
1. Check device/emulator internet connection
2. Try opening https://openrouter.ai in browser
3. If using VPN, try disabling it
4. If in China/restricted region, try using a VPN

### Issue 4: "Insufficient credits"
**Symptoms:**
- Alert shows "insufficient credits"
- Console shows 402 error

**Solutions:**
1. Check your OpenRouter dashboard: https://openrouter.ai/activity
2. Wait a bit - free tier has rate limits
3. Try again in a few minutes
4. Consider upgrading if needed

### Issue 5: AI analysis not showing
**Symptoms:**
- No error, but the AI section stays in "Analyzing..." state forever
- Or the section doesn't appear at all

**Solutions:**
1. Check if `weatherData` is loaded (temperature, AQI should be visible)
2. Look for JavaScript errors in console
3. Verify the component is rendering (look for the purple AI box)
4. Check network tab for API calls
5. Try on a different network/device

## 🔧 Advanced Debugging

### Enable Verbose Logging
Add this to `utils/openrouter.ts` at the top of `chatCompletion` function:

```typescript
console.log('=== OPENROUTER DEBUG ===');
console.log('Full API Key:', OPENROUTER_API_KEY);
console.log('Request URL:', `${BASE_URL}/chat/completions`);
console.log('Request Headers:', JSON.stringify(headers));
console.log('Request Body:', JSON.stringify({ model, messages }));
```

### Check Network Traffic
1. Use React Native Debugger
2. Or use Expo's network inspector
3. Look for POST request to `https://openrouter.ai/api/v1/chat/completions`
4. Check the response status and body

### Test Without AI
To verify everything else works, temporarily disable AI:

In `trigger-details.tsx`, comment out the AI loading:
```typescript
useEffect(() => {
  if (weatherData) {
    // loadAIAnalysis(); // TEMPORARILY DISABLED FOR TESTING
  }
}, [weatherData]);
```

If weather data shows correctly, the issue is only with AI integration.

## 📞 Getting Help

If you've tried everything and it still doesn't work:

1. **Collect Information:**
   - Error messages from console
   - Your `.env` setup (hide the actual key!)
   - Device/emulator information
   - Network setup

2. **Check OpenRouter Status:**
   - Visit https://openrouter.ai
   - Check their status page/twitter for outages

3. **Test with Different Model:**
   In `openrouter.ts`, try a different free model:
   ```typescript
   model: string = 'meta-llama/llama-3.2-3b-instruct:free'
   ```

4. **Create GitHub Issue:**
   - Repository: https://github.com/ShwetIsHere/QAir-Asthma
   - Include error logs and debugging output

---

**Remember:** After ANY changes to `.env`, you MUST restart the Expo development server!

```bash
# Stop current server (Ctrl+C)
npm start
# Or with cache reset:
npm start --reset-cache
```
