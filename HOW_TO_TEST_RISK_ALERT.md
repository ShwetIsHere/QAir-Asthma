# 🧪 How to Test Predictive Risk Alert System

## Quick Testing Guide

### Step 1: Install Dependencies
First, make sure you have the required packages:

```cmd
npm install axios
npx expo install expo-notifications expo-task-manager
```

### Step 2: Restart Your App
Restart Expo with cache clear to load the new environment variables:

```cmd
npx expo start -c
```

---

## 🎯 Testing Methods

### Method 1: Using Dashboard Buttons (Easiest)

I've added **2 new floating buttons** to your Dashboard:

1. **Purple Flask Button** (🧪) - Opens API Test Suite
2. **Yellow Shield Button** (🛡️) - Opens Risk Monitor

**Steps:**
1. Open your app
2. Go to Dashboard (Map screen)
3. Look at the right side - you'll see new buttons above the location button
4. Tap the **Purple Flask button** to test APIs
5. Tap **"Run All Tests"**
6. You should see:
   - ✅ **OpenWeather AQI API**: Working (shows AQI, PM2.5, PM10)
   - ✅ **OpenWeather Data API**: Working (shows temperature, humidity)
   - ⚠️ **Ambee Pollen API**: May fail (optional paid service - this is OK!)

---

### Method 2: Test the Risk Monitor

After API tests pass, test the actual risk monitoring:

1. **First, record a trigger:**
   - Tap the red **"Record Trigger"** button on the map
   - This saves your location + environmental data

2. **Open Risk Monitor:**
   - Tap the **Yellow Shield button**
   - You'll see the Risk Monitor interface

3. **Check Current Risk:**
   - Tap **"Check Risk Now"**
   - Grant location permissions when asked
   - Wait for the assessment (5-10 seconds)

4. **What You'll See:**
   - 📍 Your current location
   - 🌍 Live environmental data (AQI, temp, humidity, pollen)
   - 🎯 Risk Assessment:
     - **High Risk** (75-100%): Very similar to past triggers
     - **Medium Risk** (50-74%): Somewhat similar
     - **Low Risk** (<50%): Safe conditions
   - 📋 Recommendations based on risk level
   - ⚠️ Matched triggers (which past events are similar)

---

## 🔍 What to Check

### ✅ API Tests Should Show:

**OpenWeather AQI API:**
```
✅ Working Correctly
AQI: 150
PM2.5: 35.4 μg/m³
PM10: 78.2 μg/m³
```

**OpenWeather Data API:**
```
✅ Working Correctly
Temperature: 22°C
Humidity: 65%
```

**Ambee Pollen API:**
```
⚠️ Not Available (OPTIONAL)
Pollen API is optional
System will use default pollen values (low)
```

### ✅ Risk Monitor Should Show:

**Environmental Conditions:**
- Current AQI with color coding (green/yellow/red)
- Temperature in Celsius
- Humidity percentage
- Pollen level

**Risk Assessment (if you have triggers recorded):**
- Similarity score (0-100%)
- Risk level with color
- Number of matched triggers
- Top risk factors
- Safety recommendations

---

## ⚠️ Troubleshooting

### Problem: "No triggers found in database"
**Solution:** Record at least 1 trigger on the map first (red "Record Trigger" button)

### Problem: "Failed to fetch environmental data"
**Solutions:**
1. Check your internet connection
2. Verify API keys are in `.env` file
3. Restart the Expo server: `npx expo start -c`
4. Check OpenWeather API quota (1000 calls/day free)

### Problem: API Test shows ❌ errors
**Solutions:**
1. Verify `.env` has these keys:
   ```
   EXPO_PUBLIC_OPENWEATHER_API_KEY=d5be13914f4e28c820b8be84c466989c
   EXPO_PUBLIC_AMBEE_API_KEY=aa4d010531580dd2fb65a69ffac1f061df5f3144d3bf328b958da1f7f520c0f0
   ```
2. Make sure you restarted: `npx expo start -c`
3. Check console logs for specific errors
4. Try testing from a different location/network

### Problem: Location permissions denied
**Solution:**
- Android: Settings → Apps → QAir → Permissions → Location → Allow all the time
- iOS: Settings → QAir → Location → Always

### Problem: Notifications not appearing
**Solution:**
1. Grant notification permissions in app settings
2. Test on a physical device (emulators have limited notification support)
3. Check console for "Notification permission granted" message

---

## 📊 Console Logs to Watch

When you tap "Check Risk Now", you should see:

```
🎯 Starting risk assessment...
📍 Current location: {latitude: 40.7128, longitude: -74.0060}
🌍 Fetching environmental data...
✅ Environmental data: {aqi: 150, temperature: 22, humidity: 65}
📚 Found 5 triggers in database
🔍 Comparing with trigger: abc123...
📊 Similarity: 85%
🎯 Risk Assessment Complete - Level: HIGH
🚨 Sending risk alert notification...
```

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ API tests show at least 2/3 passing (OpenWeather AQI + Weather)
2. ✅ "Check Risk Now" fetches your location
3. ✅ Environmental data displays correctly
4. ✅ Risk assessment calculates (if you have triggers)
5. ✅ Notifications appear for high/medium risk
6. ✅ No errors in console logs

---

## 🚀 Advanced Testing

### Test Auto-Monitoring
1. Toggle "Auto-Monitor" switch ON in Risk Monitor
2. Grant background location permission
3. Move to a different location
4. App should check risk periodically

### Test Geofencing
1. Record several triggers in one area (within 500m)
2. Leave the area
3. Come back to that area
4. You should receive a geofence alert

### Test Daily Reminders
Add this to `PredictiveRiskAlert.tsx`:
```typescript
import { scheduleDailyReminder } from '@/utils/notificationService';

useEffect(() => {
  scheduleDailyReminder(); // 8 AM daily check
}, []);
```

---

## 📞 Quick Reference

**Dashboard Buttons:**
- 🔴 Red SOS Button - Emergency contacts
- 🟡 Yellow Shield - Risk Monitor
- 🟣 Purple Flask - API Tests
- ⚪ White Location - Center map on your location
- 🔴 Red "Record Trigger" - Save current location as trigger

**What Each Test Does:**
- **API Test**: Verifies your API keys work
- **Risk Monitor**: Compares current conditions to past triggers
- **Auto-Monitor**: Continuous background checking
- **Geofencing**: Alerts when entering risky zones

---

## 🎯 Next Steps After Testing

Once everything works:
1. Add more triggers by using the app outdoors
2. Test in different locations (home, work, park)
3. Adjust thresholds in `utils/riskAssessment.ts` if too sensitive
4. Enable auto-monitoring for proactive alerts
5. Share feedback on accuracy

**Need Help?**
- Check `PREDICTIVE_RISK_ALERT_GUIDE.md` for detailed technical docs
- Check `NEXT_STEPS_RISK_ALERT.md` for setup instructions
- Review console logs for specific errors
