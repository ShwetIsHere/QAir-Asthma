@echo off
echo ========================================
echo QAir - Quick Fix for Background Locawtion
echo ========================================
echo.
echo This script will:
echo 1. Stop the current Expo server
echo 2. Rebuild the Android native code
echo 3. Reinstall the app on your device
echo.
echo IMPORTANT: Make sure your Android device is connected via USB
echo and USB debugging is enabled!
echo.
pause

echo.
echo Stopping any running Metro bundler...
taskkill /F /IM node.exe 2>nul

echo.
echo Cleaning and rebuilding Android...
cd android
call gradlew.bat clean
call gradlew.bat assembleDebug
cd ..

echo.
echo Installing APK on device...
adb uninstall com.qair.app
adb install android\app\build\outputs\apk\debug\app-debug.apk

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo The app has been reinstalled with background location permission.
echo.
echo NEXT STEPS:
echo 1. Open the QAir app on your device
echo 2. Tap the Yellow Shield button (Risk Monitor)
echo 3. Toggle "Auto-Monitor" ON
echo 4. Grant "Allow all the time" when prompted
echo.
echo ✅ Background location permission should now work!
echo.
pause
