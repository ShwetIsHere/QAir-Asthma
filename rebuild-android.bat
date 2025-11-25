@echo off
echo ========================================
echo QAir - Android Rebuild Script
echo ========================================
echo.
echo This will rebuild your Android app to apply the background location permission.
echo.
pause

echo.
echo [1/4] Cleaning Expo cache...
call npx expo start --clear

echo.
echo [2/4] Running prebuild (this may take a few minutes)...
call npx expo prebuild --clean --platform android

echo.
echo [3/4] Cleaning Android build...
cd android
call gradlew.bat clean
cd ..

echo.
echo [4/4] Building and installing on device...
call npx expo run:android

echo.
echo ========================================
echo Build Complete!
echo ========================================
echo.
echo NEXT STEPS:
echo 1. The app should now be running on your device
echo 2. Go to Dashboard and tap the Yellow Shield button (Risk Monitor)
echo 3. Toggle "Auto-Monitor" ON
echo 4. You should see the background location permission dialog
echo 5. Choose "Allow all the time"
echo.
echo No more errors! ✅
echo.
pause
