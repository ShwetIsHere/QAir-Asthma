@echo off
echo ============================================
echo Installing Predictive Risk Alert Dependencies
echo ============================================
echo.

echo [1/3] Installing axios for API calls...
call npm install axios
echo.

echo [2/3] Installing expo-notifications (optional but recommended)...
call npx expo install expo-notifications
echo.

echo [3/3] Installing expo-task-manager (optional - for background geofencing)...
call npx expo install expo-task-manager
echo.

echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo Next Steps:
echo 1. Get OpenWeather API key: https://openweathermap.org/api
echo 2. Add to .env file:
echo    EXPO_PUBLIC_OPENWEATHER_API_KEY=your_key_here
echo.
echo 3. (Optional) Get Ambee Pollen API key: https://www.getambee.com/
echo    EXPO_PUBLIC_AMBEE_API_KEY=your_key_here
echo.
echo 4. Read PREDICTIVE_RISK_ALERT_GUIDE.md for usage
echo.
pause
