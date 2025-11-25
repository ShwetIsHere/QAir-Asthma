# ⚡ Predictive Risk Alert - Quick Start

## 🚀 5-Minute Setup

### Step 1: Install Dependencies (1 min)
Run the installation script:
```cmd
install-risk-alert.bat
```

Or manually:
```cmd
npm install axios
npx expo install expo-notifications
```

### Step 2: Get API Key (2 min)
1. Go to https://openweathermap.org/api
2. Click "Sign Up" (free)
3. Verify email
4. Copy your API key from dashboard

### Step 3: Add to .env file (1 min)
```
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_actual_key_here
```

### Step 4: Test It! (1 min)
1. Add the component to your dashboard
2. Tap "Check Risk Now"
3. Allow location permission
4. See your first risk assessment!

---

## 🎯 Quick Integration

### Add to Dashboard (Simplest)
In `app/(tabs)/dashboard.tsx`:

```tsx
import { useState } from 'react';
import PredictiveRiskAlert from '@/components/PredictiveRiskAlert';

export default function Dashboard() {
  const [showRisk, setShowRisk] = useState(false);

  return (
    <>
      {/* Your existing map view */}
      
      {/* Add Risk Monitor Button */}
      <TouchableOpacity
        onPress={() => setShowRisk(true)}
        className="absolute top-4 right-4 bg-indigo-600 p-3 rounded-full shadow-lg"
        style={{ elevation: 5 }}>
        <Ionicons name="shield-checkmark" size={24} color="white" />
      </TouchableOpacity>

      {/* Risk Monitor Modal */}
      <Modal
        visible={showRisk}
        animationType="slide"
        onRequestClose={() => setShowRisk(false)}>
        <View className="flex-1">
          <TouchableOpacity
            onPress={() => setShowRisk(false)}
            className="absolute top-4 right-4 z-10 bg-gray-200 p-2 rounded-full">
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <PredictiveRiskAlert />
        </View>
      </Modal>
    </>
  );
}
```

---

## ✅ Test Checklist

- [ ] Install dependencies
- [ ] Add OpenWeather API key to .env
- [ ] Restart Expo dev server
- [ ] Grant location permission
- [ ] Record at least 1 trigger on map
- [ ] Open Risk Monitor
- [ ] Tap "Check Risk Now"
- [ ] See risk assessment

---

## 🎨 Quick Customization

### Change Risk Thresholds
In `utils/riskAssessment.ts` (line 7):
```typescript
export const SIMILARITY_THRESHOLDS = {
  AQI_DIFFERENCE: 25,        // Lower = stricter matching
  HUMIDITY_DIFFERENCE: 15,    // Lower = stricter matching
  TEMPERATURE_DIFFERENCE: 5,
  DISTANCE_THRESHOLD_KM: 2,   // Higher = larger area
};
```

### Change Alert Messages
In `components/PredictiveRiskAlert.tsx` (line 142):
```typescript
if (assessment.riskLevel === 'high') {
  Alert.alert(
    '🚨 YOUR CUSTOM TITLE',
    'Your custom message...',
  );
}
```

---

## 🔍 How to Debug

### Check API Connection
```typescript
// In environmentalDataAPI.ts, add console logs:
console.log('API Key:', OPENWEATHER_API_KEY);
console.log('API Response:', response.data);
```

### Test Without API
Replace `fetchEnvironmentalData` with mock data:
```typescript
export const fetchEnvironmentalData = async (lat: number, lon: number) => {
  return {
    latitude: lat,
    longitude: lon,
    aqi: 120,
    temperature: 25,
    humidity: 70,
    pm25: 30,
    pm10: 50,
    pollenCount: 100,
    pollenLevel: 'medium' as const,
    timestamp: new Date().toISOString(),
  };
};
```

---

## 📱 User Flow

1. **First Time User** (No triggers)
   - Tap "Check Risk Now"
   - Sees message: "Start recording triggers to get personalized alerts"
   - Records first trigger on map
   
2. **Regular User** (Has triggers)
   - Opens Risk Monitor
   - Taps "Check Risk Now"
   - Sees risk level based on past triggers
   - Gets recommendations

3. **Power User** (Auto-monitoring)
   - Enables "Automatic Monitoring" toggle
   - Gets background location permission
   - Receives alerts when entering risky areas
   - No manual checking needed

---

## 🚨 Common Issues

### "Could not fetch environmental data"
**Solution**: Check internet connection and API key

### "Location permission denied"
**Solution**: Go to phone Settings → QAir → Location → Always Allow

### "No trigger history found"
**Solution**: Record at least 1 trigger on the map first

### API quota exceeded (1000 calls/day)
**Solution**: Wait until tomorrow or upgrade OpenWeather plan

---

## 📊 Understanding Risk Scores

| Score | Risk Level | Action |
|-------|------------|--------|
| 75-100% | 🔴 HIGH | Keep inhaler ready, stay alert |
| 50-74% | 🟠 MEDIUM | Be prepared, monitor symptoms |
| 0-49% | 🟢 LOW | Safe to proceed |

**Factors Considered**:
- ✅ AQI similarity (30% weight)
- ✅ Humidity similarity (20% weight)
- ✅ PM2.5 similarity (20% weight)
- ✅ Temperature similarity (15% weight)
- ✅ Location proximity (15% weight)

---

## 🎓 Next Steps

Once basic setup works:
1. ✅ Enable automatic monitoring
2. ✅ Install expo-task-manager for background geofencing
3. ✅ Add Ambee API for real pollen data
4. ✅ Customize thresholds for your sensitivity
5. ✅ Share with emergency contacts

---

## 💡 Pro Tips

- Record triggers in various weather conditions for better accuracy
- Check risk before outdoor activities
- Enable auto-monitoring for continuous protection
- Review matched triggers to understand patterns
- Adjust thresholds if getting too many/few alerts

---

**Ready? Run `install-risk-alert.bat` and start protecting yourself!** 🛡️
