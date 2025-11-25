# 🔍 Quick Debug Checklist

## ✅ Things to Check Right Now

### 1. **Check Your Supabase Table**

Open Supabase Dashboard → SQL Editor → Run this:

```sql
-- Check if table exists
SELECT * FROM inhaler_triggers LIMIT 5;

-- If you get "relation does not exist", run this:
-- Copy and paste the entire content of supabase_schema.sql
```

### 2. **Check ESP32 Serial Monitor**

You should see:
```
13:06:08.231 -> Trigger #1 - FSR: 4095
13:07:15.822 -> BLE Connected
13:07:32.219 -> Trigger #5 - FSR: 4095
13:07:32.219 -> Sent to app
```

✅ **"Sent to app"** = ESP32 is working correctly!

### 3. **Check QAir App Console** (Metro Bundler)

When you connect, you should see:
```
Connecting to device: QAir-Inhaler
Connected! Discovering services...
Services discovered
Monitoring ESP32 inhaler for triggers...
✓ Monitoring active for inhaler triggers
```

When FSR pressed:
```
ESP32 Trigger received: {event: "trigger", fsrValue: 4095, ...}
Recording inhaler trigger...
Location: 22.307200, 73.181200
Air quality: 45
✓ Trigger recorded in Supabase
```

### 4. **Check Permissions**

Settings → Apps → QAir:
- ✅ Bluetooth: Allowed
- ✅ Location: Allow all the time (or While using app)
- ✅ Nearby devices (Android 12+): Allowed

### 5. **Check Login Status**

Make sure you're logged in! The app needs a user ID to save triggers.

In app console, you should NOT see:
```
❌ No user logged in
```

If you see this, go to Login screen and sign in.

---

## 🐛 Common Issues

### Issue 1: "Trigger #X - FSR: 4095" but NO "Sent to app"

**Cause:** BLE not connected

**Fix:**
1. Check Serial Monitor shows "BLE Connected"
2. Reconnect from QAir app
3. Look for "Monitoring active" in console

---

### Issue 2: "Sent to app" but no alert in phone

**Cause:** Monitoring not set up or app crashed

**Fix:**
1. Check Metro console for errors
2. Restart app: Press 'r' in Metro bundler
3. Check device name is exactly "QAir-Inhaler"

**Verify in code:**
```typescript
// In BluetoothManager.tsx line ~374
if (device.name === 'QAir-Inhaler' || device.name?.includes('QAir')) {
```

---

### Issue 3: Alert shows but no data in Supabase

**Cause:** Table doesn't exist or RLS policy issue

**Fix:**
1. Run `supabase_schema.sql` in Supabase SQL Editor
2. Check user is authenticated:
   ```sql
   SELECT auth.uid(); -- Should return your user UUID
   ```
3. Check insert worked:
   ```sql
   SELECT * FROM inhaler_triggers 
   WHERE user_id = auth.uid() 
   ORDER BY timestamp DESC 
   LIMIT 5;
   ```

---

### Issue 4: "Location permission denied"

**Fix:**
```typescript
// In app, request permissions manually
import * as Location from 'expo-location';
const { status } = await Location.requestForegroundPermissionsAsync();
```

Or Settings → QAir → Permissions → Location → Allow

---

## 📱 Test Right Now

1. **Power on ESP32** - Check Serial Monitor shows "BLE Started"
2. **Open QAir app** - Make sure you're logged in
3. **Connect Bluetooth** - Tap icon, select "QAir-Inhaler"
4. **Press FSR** - Wait for alert
5. **Check Supabase** - Query table for new row

**Expected time:** < 5 seconds from FSR press to Supabase row

---

## 🎯 Success Looks Like This

### Serial Monitor:
```
Trigger #1 - FSR: 856
Sent to app
```

### Phone Alert:
```
Inhaler Use Recorded
Trigger #1 recorded at Good air quality (AQI: 45)
```

### Supabase Query:
```sql
SELECT timestamp, aqi, category 
FROM inhaler_triggers 
ORDER BY timestamp DESC 
LIMIT 1;
```

Result:
```
timestamp: 2025-11-10 13:09:34.803+00
aqi: 45
category: Good
```

---

**If all three match, YOU'RE DONE! 🎉**

If not, check the issue above that matches your problem.
