@echo off
echo ========================================
echo Clearing Gradle Cache
echo ========================================
echo.

echo Step 1: Stopping Gradle daemon...
cd android
call gradlew --stop
cd ..

echo.
echo Step 2: Cleaning project...
cd android
call gradlew clean
cd ..

echo.
echo Step 3: Clearing Metro bundler cache...
call npx expo start -c --no-dev --minify

echo.
echo ========================================
echo Cache cleared successfully!
echo You can now run: npx expo run:android
echo ========================================
pause
