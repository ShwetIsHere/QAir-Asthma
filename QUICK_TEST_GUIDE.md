# QAir App - Quick Test Guide

## 🚀 Start Testing in 3 Steps

### Step 1: Restart the App Fresh
```bash
npm start --reset-cache
```

### Step 2: Test All New Features

#### ✅ Feature 1: Clear Cache & Restart
1. Open app → Settings tab (or Settings page)
2. Scroll down → Find "Clear Cache"
3. Tap → Confirm → App restarts fresh
4. **Expected**: All cache cleared, app reloads

#### ✅ Feature 2: Contact Team
1. Settings → Contact Us
2. **Expected**: See 3 names:
   - Shwet Patel (patel.s.manojbhai@nuv.ac.in)
   - Jai Jaiswal (jay.l.jaiswal@nuv.ac.in)
   - Ujjaval Rathod (ujjaval.r.rathod@nuv.ac.in)
3. Tap any name → Email opens

#### ✅ Feature 3: About QAir
1. Settings → About
2. **Expected**: Detailed description showing:
   - App purpose for asthma patients
   - Key features list
   - How it works (4 steps)
   - Developer names

#### ✅ Feature 4: Show All Places (MOST IMPORTANT FIX!)
1. Go to Profile tab
2. Scroll to "**Top Visited Places**" section
   - Should show **5 places** initially
   - Tap "**Show All X Places**" → Shows all
   - Tap "**Show Less**" → Collapse back to 5
   
3. Scroll to "**All Marked Places**" section
   - Should show **10 triggers** initially
   - Tap "**Show All X Places**" → Shows all
   - Tap "**Show Less**" → Collapse back to 10

#### ✅ Feature 5: Performance Check
1. Open Performance Monitor:
   - Shake device → "Show Perf Monitor"
2. Navigate through tabs rapidly
3. Scroll in Profile page
4. **Expected FPS**: 55-60 (smooth)

### Step 3: Verify No Crashes
1. Use app for 10+ minutes
2. Navigate between all tabs
3. Click multiple markers on map
4. Check Profile multiple times
5. **Expected**: No OutOfMemoryError crashes

---

## 🎯 What Changed?

| Feature | Before | After |
|---------|--------|-------|
| **Clear Cache** | Only cleared partial cache | Clears everything & restarts |
| **Contact** | Generic support@qair.com | 3 team members with real emails |
| **About** | Short text | Comprehensive description |
| **Show All** | ❌ Button didn't work | ✅ Works perfectly with Show Less |
| **Performance** | Laggy scrolling | Smooth 60 FPS |

---

## 📱 Quick Visual Test

### Profile Tab - Before & After:

**BEFORE** (Not Working):
```
Top Visited Places
├─ Place 1
├─ Place 2
├─ Place 3
...
├─ Place 25 (all showing, slow!)
└─ [Show All 25 Places] ❌ Does nothing
```

**AFTER** (Working!):
```
Top Visited Places
├─ Place 1
├─ Place 2
├─ Place 3
├─ Place 4
├─ Place 5
└─ [Show All 25 Places ▼] ← Click this
    ↓
All 25 Places Shown
└─ [Show Less ▲] ← Click to collapse
```

---

## ⚡ Performance Test

Run this test sequence 3 times:

```
Dashboard → Profile → News → Settings → Dashboard
```

**Before fixes**: Laggy, slow transitions, memory builds up
**After fixes**: Smooth, instant transitions, memory cleaned up

---

## 🐛 If Something Doesn't Work

### Issue: "Show All" still not working
**Fix**: Force restart the bundler
```bash
# Stop the app, then:
npm start --reset-cache
```

### Issue: App still crashes
**Fix**: Check Android logcat
```bash
npx react-native log-android
```
Look for "OutOfMemoryError" - if you see it, report it!

### Issue: Performance still laggy
**Fix**: Enable Hermes (should be enabled already)
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

---

## ✅ Success Criteria

You'll know everything works when:

1. ✅ Clear Cache → App restarts with clean slate
2. ✅ Contact Us → See 3 team member names
3. ✅ About → See detailed app description
4. ✅ Show All → Expands places list
5. ✅ Show Less → Collapses places list
6. ✅ Smooth scrolling → No lag, 60 FPS
7. ✅ No crashes → App runs for 30+ minutes without OutOfMemoryError

---

## 🎉 Ready to Test!

Just run:
```bash
npm start --reset-cache
```

Then test all 5 features above. It should all work perfectly now! 🚀

---

**Need Help?**  
Contact: Shwet, Jai, or Ujjaval (emails in Contact Us section)
