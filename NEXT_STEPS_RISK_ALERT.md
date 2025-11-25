# 🎯 Next Steps: Complete Predictive Risk Alert Setup

## ✅ What's Already Done
- ✅ All 5 core utility files created (API, risk assessment, geofencing, notifications, service)
- ✅ PredictiveRiskAlert main UI component built
- ✅ Test component (TestPredictiveRiskAPIs) created
- ✅ API keys added to .env file
- ✅ Documentation guides written

## 📋 What You Need to Do Now

### Step 1: Install Dependencies (REQUIRED)
Open terminal and run these commands:

```cmd
npm install axios
npx expo install expo-notifications
npx expo install expo-task-manager
```

**Why:** These packages are needed for:
- `axios`: Fetching air quality and weather data from APIs
- `expo-notifications`: Sending risk alerts to users
- `expo-task-manager`: (Optional) Background location monitoring

---

### Step 2: Restart Expo Dev Server
After installing dependencies, restart with cache clear:

```cmd
npx expo start -c
```

**Why:** This ensures new environment variables and dependencies are loaded.

---

### Step 3: Test the APIs
1. In your app, navigate to the test screen (you'll need to add it to your navigator)
2. Or run this code snippet in your dashboard temporarily:

**Quick Test Method:**
Add this import to `app/(tabs)/dashboard.tsx`:
```typescript
import TestPredictiveRiskAPIs from '@/components/TestPredictiveRiskAPIs';
```

Then add a test button in the floating buttons section:
```tsx
<TouchableOpacity
  onPress={() => router.push('test-apis')} // You'll need to create this route
  className="bg-purple-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl"
  style={{ elevation: 8 }}>
  <Ionicons name="flask" size={32} color="white" />
</TouchableOpacity>
```

3. Tap "Run All Tests"
4. You should see:
   - ✅ OpenWeather AQI API: Working
   - ✅ OpenWeather Data API: Working
   - ⚠️ Ambee Pollen API: May fail (optional, paid service)

**If tests fail:**
- Check your internet connection
- Verify API keys in `.env` file
- Check OpenWeather dashboard for quota limits
- Make sure you restarted Expo server after adding keys

---

### Step 4: Integrate PredictiveRiskAlert into Your App

**Option A: Add as a new tab (Recommended)**

Edit `app/(tabs)/_layout.tsx`:
```typescript
<Tabs.Screen
  name="risk-monitor"
  options={{
    title: 'Risk Monitor',
    tabBarIcon: ({ color }) => <Ionicons name="shield-checkmark" size={28} color={color} />,
  }}
/>
```

Create `app/(tabs)/risk-monitor.tsx`:
```typescript
import PredictiveRiskAlert from '@/components/PredictiveRiskAlert';

export default function RiskMonitorScreen() {
  return <PredictiveRiskAlert />;
}
```

**Option B: Add floating button to Dashboard**

In `dashboard.tsx`, add this in the floating buttons section:
```tsx
<TouchableOpacity
  onPress={() => setRiskMonitorVisible(true)}
  className="bg-yellow-500 w-16 h-16 rounded-full items-center justify-center shadow-2xl"
  style={{ elevation: 8 }}>
  <Ionicons name="shield-checkmark" size={32} color="white" />
</TouchableOpacity>

{/* Modal */}
<Modal
  visible={riskMonitorVisible}
  animationType="slide"
  onRequestClose={() => setRiskMonitorVisible(false)}>
  <PredictiveRiskAlert />
  <TouchableOpacity
    onPress={() => setRiskMonitorVisible(false)}
    className="absolute top-12 right-6 bg-gray-800 p-3 rounded-full">
    <Ionicons name="close" size={24} color="white" />
  </TouchableOpacity>
</Modal>
```

**Option C: Add to Profile page**

In `app/(tabs)/profile.tsx`, add after challenges section:
```tsx
<View className="mb-6">
  <Text className="text-gray-900 font-bold text-xl mb-4">🛡️ Risk Monitor</Text>
  <PredictiveRiskAlert />
</View>
```

---

### Step 5: Test End-to-End Workflow

1. **Record a trigger on the map** with AQI/weather data
   - Go to Dashboard
   - Tap "Record Trigger" button
   - This saves your current location + environmental conditions

2. **Open Risk Monitor** (wherever you integrated it)

3. **Tap "Check Risk Now"**
   - Grant location permissions
   - Watch console logs for API calls
   - See risk assessment results

4. **Expected Results:**
   - If you're near a past trigger location: High/Medium risk alert
   - If conditions match past triggers: Similarity score shown
   - Risk factors highlighted (AQI, humidity, temp, PM2.5, location)
   - Recommendations displayed

5. **Test Auto-Monitoring** (Optional)
   - Toggle "Auto-Monitor" switch ON
   - Grant background location permission
   - Move near a past trigger location
   - Should receive notification alert

---

## 🔧 Troubleshooting

### API Tests Fail
**Problem:** Red X on API tests

**Solutions:**
1. Check `.env` file has correct keys
2. Restart dev server: `npx expo start -c`
3. Verify API quota on OpenWeather dashboard
4. Check internet connection
5. Try different test coordinates

### Location Permission Denied
**Problem:** "Location permission required" error

**Solutions:**
1. Go to phone Settings > Apps > QAir > Permissions
2. Enable Location (Allow all the time for background monitoring)
3. Restart app

### No Risk Alert Shown
**Problem:** "No triggers found" message

**Solutions:**
1. Record at least 1 trigger on map first
2. Check Supabase `inhaler_triggers` table has data
3. Verify user is logged in
4. Check console logs for errors

### Notifications Not Working
**Problem:** No push notification on risk

**Solutions:**
1. Install expo-notifications: `npx expo install expo-notifications`
2. Grant notification permissions in Settings
3. Check notification channel created (Android)
4. Test on physical device (notifications don't work well on simulator)

### Build Errors
**Problem:** TypeScript/import errors

**Solutions:**
1. Run `npm install` to ensure all deps installed
2. Clear cache: `npx expo start -c`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
4. Check all imports use correct paths

---

## 📊 How to Verify Everything Works

### Checklist
- [ ] Dependencies installed (axios, expo-notifications)
- [ ] Dev server restarted with cache clear
- [ ] API tests pass (at least OpenWeather)
- [ ] Risk Monitor integrated into app UI
- [ ] Location permission granted
- [ ] At least 1 trigger recorded on map
- [ ] "Check Risk Now" returns assessment
- [ ] Similarity score calculates correctly
- [ ] Risk level shown (High/Medium/Low)
- [ ] Recommendations displayed
- [ ] Notifications work (if enabled)

### Console Log Verification
When you tap "Check Risk Now", you should see:
```
🎯 Starting risk assessment...
📍 Current location: {lat, lon}
🌍 Fetching environmental data...
✅ Environmental data: {aqi, temp, humidity, pollen}
📚 Found X triggers in database
🔍 Comparing with trigger: {triggerId}
📊 Similarity: X%
🎯 Risk Assessment Complete - Level: HIGH/MEDIUM/LOW
```

---

## 🎉 What Happens Next

Once everything is working:
1. **Daily Use:** Users tap "Check Risk Now" before going outside
2. **Auto-Monitoring:** Background monitoring alerts users entering risky zones
3. **Data Learning:** More triggers = better risk predictions
4. **Customization:** Users can adjust thresholds in `utils/riskAssessment.ts`

---

## 🚀 Advanced Features (Optional)

### 1. Customize Risk Thresholds
Edit `utils/riskAssessment.ts`:
```typescript
export const SIMILARITY_THRESHOLDS = {
  aqi: 30,        // ±30 AQI points (make smaller for stricter)
  humidity: 15,   // ±15% humidity
  temperature: 5, // ±5°C
  pm25: 10,       // ±10 μg/m³
  distance: 2000, // 2km radius (make smaller for stricter)
};
```

### 2. Enable Daily Reminders
In `PredictiveRiskAlert.tsx`, call:
```typescript
import { scheduleDailyReminder } from '@/utils/notificationService';

useEffect(() => {
  scheduleDailyReminder(); // 8 AM daily notifications
}, []);
```

### 3. Add Geofence Monitoring
Install task manager: `npx expo install expo-task-manager`

Then implement background task in `App.tsx` (see PREDICTIVE_RISK_ALERT_GUIDE.md)

### 4. Adjust Scoring Weights
Edit `utils/riskAssessment.ts` → `calculateTriggerSimilarity()`:
```typescript
// Current: AQI=30pts, Humidity=20pts, Temp=15pts, PM2.5=20pts, Location=15pts
// Make AQI more important:
if (aqiMatch) score += 40; // Increase from 30
if (locationMatch) score += 10; // Decrease from 15
```

---

## 📞 Need Help?

If you get stuck:
1. Check `PREDICTIVE_RISK_ALERT_GUIDE.md` for detailed docs
2. Check `QUICK_START_RISK_ALERT.md` for 5-minute setup
3. Review console logs for specific errors
4. Check Supabase dashboard for data issues
5. Verify all environment variables are set

---

## 🎯 Summary

**Right now, run these 2 commands:**
```cmd
npm install axios
npx expo install expo-notifications
npx expo start -c
```

**Then:**
1. Test APIs with TestPredictiveRiskAPIs component
2. Add PredictiveRiskAlert to your app (tab/modal/profile)
3. Record a trigger on map
4. Test "Check Risk Now" button
5. Enjoy proactive asthma risk monitoring! 🎉

---

**Status:** 🟡 90% Complete - Just needs dependency installation and integration!
