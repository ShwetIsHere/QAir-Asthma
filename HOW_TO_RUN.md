# ✅ Setup Complete! How to Run Your App

## 🎉 Good News!
Your app is now configured with native code and ready to run!

## 📱 Choose Your Testing Method

### Option 1: Use Android Emulator (Recommended)

#### Step 1: Open Android Studio
1. Open Android Studio
2. Click **"More Actions"** → **"Virtual Device Manager"**
3. Click **"Create Device"**
4. Select a phone (e.g., Pixel 5)
5. Download and select **Android 13.0 (API 33)** or higher
6. Click **"Finish"**
7. Click the **Play button** ▶️ to start the emulator

#### Step 2: Run Your App
```bash
cd "f:\Asthma Native\QAir"
npx expo run:android
```

The app will automatically install and launch on the emulator!

---

### Option 2: Use Physical Android Device

#### Step 1: Enable Developer Mode on Your Phone
1. Go to **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings** → **Developer Options**
4. Enable **USB Debugging**

#### Step 2: Connect Your Phone
1. Connect phone to computer via USB
2. Allow USB debugging on phone
3. Verify connection:
   ```bash
   adb devices
   ```
   You should see your device listed

#### Step 3: Run Your App
```bash
cd "f:\Asthma Native\QAir"
npx expo run:android
```

---

### Option 3: Test Without Maps (Quick Test)

If you just want to test authentication and settings without maps:

```bash
cd "f:\Asthma Native\QAir"
npm start
```

Then:
- Press `w` for web browser (no maps)
- Or scan QR code with Expo Go app (limited features)

**What works:**
- ✅ Login/Register
- ✅ Settings page
- ✅ Navigation
- ❌ Maps (needs emulator/device)

---

## 🚀 Recommended: Run on Android Emulator

### Quick Start:
```bash
# 1. Start Android Studio and launch an emulator
# 2. Then run:
cd "f:\Asthma Native\QAir"
npx expo run:android
```

### What You'll Get:
- ✅ Full app with Google Maps
- ✅ Location tracking
- ✅ Trigger recording
- ✅ Red zones
- ✅ Real air quality data
- ✅ All features working!

---

## 🛠️ Don't Have Android Studio?

### Download Android Studio:
1. Go to: https://developer.android.com/studio
2. Download and install
3. Open Android Studio
4. Go to **More Actions** → **SDK Manager**
5. Install **Android SDK Platform 33** or higher
6. Create a virtual device (see Option 1 above)

---

## ✅ Verify Your Setup

### Check if emulator is running:
```bash
adb devices
```

Should show:
```
List of devices attached
emulator-5554   device
```

### Then run your app:
```bash
npx expo run:android
```

---

## 🎯 First Time Setup

If this is your first time running on Android:

1. **Install Android Studio** (if not installed)
2. **Create an emulator** (Pixel 5 recommended)
3. **Start the emulator**
4. **Run the app:**
   ```bash
   npx expo run:android
   ```

The first build will take 5-10 minutes. Subsequent builds are much faster!

---

## 📊 What Happens During Build

1. ✅ Generates Android native code
2. ✅ Configures Google Maps
3. ✅ Sets up location permissions
4. ✅ Installs dependencies
5. ✅ Compiles and installs app
6. ✅ Launches on emulator/device

---

## 🐛 Troubleshooting

### "No devices found"
**Solution:** Start Android emulator first, then run the app

### "Build failed"
**Solution:** 
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### "SDK not found"
**Solution:** 
1. Open Android Studio
2. Tools → SDK Manager
3. Install Android 13.0 (API 33)

---

## 💡 Pro Tips

1. **Keep emulator running** - Faster rebuilds
2. **Use Pixel 5 emulator** - Good performance
3. **Enable "Wipe Data"** - If app acts weird
4. **Check console** - See live logs and errors

---

## 🎊 You're Almost There!

Your app is fully configured and ready. Just:
1. Start Android emulator
2. Run `npx expo run:android`
3. Wait for build to complete
4. Test all features!

---

## 📞 Quick Commands Reference

```bash
# Start development server (web/Expo Go)
npm start

# Run on Android (full features)
npx expo run:android

# Run on iOS (Mac only)
npx expo run:ios

# Clean and rebuild
npx expo prebuild --clean
npx expo run:android

# Check connected devices
adb devices

# View logs
npx react-native log-android
```

---

**Ready to see your app in action! 🚀**

Just start an Android emulator and run `npx expo run:android`!
