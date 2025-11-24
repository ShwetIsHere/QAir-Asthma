@echo off
echo ========================================
echo QAir - Rebuild and Fix Native Modules
echo ========================================
echo.
echo This script will fix the "Cannot find native module" error by:
echo 1. Stopping the current Expo server
echo 2. Cleaning the Android build cache
echo 3. Rebuilding the native app with new dependencies
echo 4. Reinstalling the app on your device
echo.
echo IMPORTANT: Make sure your Android device is connected via USB
echo and USB debugging is enabled!
echo.
pause

echo.
echo Stopping any running Metro bundler...
taskkill /F /IM node.exe 2>nul

echo.
echo Cleaning Android build...
cd android
call gradlew.bat clean
cd ..

echo.
echo Rebuilding and Installing App...
echo This may take a few minutes...
call npx expo run:android

echo.
echo ========================================
echo Process Complete!
echo ========================================
echo.
echo If the app opened successfully, the error should be gone.
echo.
pause
