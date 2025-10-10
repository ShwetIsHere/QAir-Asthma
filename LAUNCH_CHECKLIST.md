# 🚀 QAir App - Launch Checklist

Use this checklist to ensure your app is properly configured and ready to launch!

## ✅ Pre-Launch Checklist

### 📦 1. Dependencies Installation
- [ ] Run `npm install` successfully
- [ ] No dependency conflicts or warnings
- [ ] All packages installed correctly

### 🔐 2. Supabase Configuration
- [ ] Created Supabase project
- [ ] Executed SQL scripts from `SUPABASE_SETUP.md`
- [ ] Created `inhaler_triggers` table
- [ ] Created `user_settings` table
- [ ] Created `user_profiles` table (optional)
- [ ] Enabled Row Level Security (RLS)
- [ ] Configured RLS policies for all tables
- [ ] Tested database connection
- [ ] Added Supabase URL to `.env`
- [ ] Added Supabase anon key to `.env`

### 🗺️ 3. Google Maps Setup
- [ ] Created Google Cloud project
- [ ] Enabled Maps SDK for Android
- [ ] Enabled Maps SDK for iOS
- [ ] Generated API key
- [ ] Added API key to `app.json` (Android)
- [ ] Added API key to `app.json` (iOS)
- [ ] Added API key to `.env`
- [ ] Tested map display on emulator

### 🌡️ 4. Air Quality API (Optional)
- [ ] Signed up for OpenWeatherMap
- [ ] Generated API key
- [ ] Added API key to `.env`
- [ ] Tested API call
- [ ] Verified mock data fallback works

### 📱 5. Environment Variables
- [ ] Copied `.env.example` to `.env`
- [ ] Filled in `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Filled in `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Filled in `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Filled in `EXPO_PUBLIC_OPENWEATHER_API_KEY` (optional)
- [ ] Verified `.env` is in `.gitignore`

### 🛠️ 6. App Configuration
- [ ] Updated `app.json` with correct app name
- [ ] Updated `app.json` with correct slug
- [ ] Added Google Maps API key to `app.json`
- [ ] Configured location permissions
- [ ] Set proper bundle identifiers
- [ ] Updated app icons (optional)
- [ ] Updated splash screen (optional)

## 🧪 Testing Checklist

### 🔐 Authentication Testing
- [ ] Register new account
- [ ] Receive verification email
- [ ] Verify email address
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Logout successfully
- [ ] Auto-login on app restart
- [ ] Forgot password flow (if implemented)

### 🗺️ Map Features Testing
- [ ] Map displays correctly
- [ ] User location shows on map
- [ ] Location permission prompt appears
- [ ] Can zoom in/out on map
- [ ] Can pan around the map
- [ ] "Center Location" button works
- [ ] Map loads within 3 seconds

### 🎯 Trigger Recording Testing
- [ ] "Record Trigger" button visible
- [ ] Click triggers location capture
- [ ] Air quality data fetches correctly
- [ ] Marker appears on map immediately
- [ ] Data saves to Supabase
- [ ] Success message displays
- [ ] Can view trigger in database
- [ ] Multiple triggers can be recorded

### 🔴 Red Zone Testing
- [ ] Create 5 triggers close together
- [ ] Red circle appears on map
- [ ] Circle has 500m radius
- [ ] Color is semi-transparent red
- [ ] Multiple red zones can exist
- [ ] Red zones update when new triggers added

### 📊 Marker Details Testing
- [ ] Tap marker opens bottom sheet
- [ ] Bottom sheet displays AQI data
- [ ] AQI value is correct
- [ ] AQI category is correct
- [ ] PM2.5 and PM10 values shown
- [ ] Temperature displays correctly
- [ ] Humidity displays correctly
- [ ] Timestamp is formatted properly
- [ ] Can close bottom sheet
- [ ] Swipe down to close works

### ⚙️ Settings Testing
- [ ] Settings tab opens correctly
- [ ] User profile displays
- [ ] Email shows correctly
- [ ] Full name displays
- [ ] Toggle notifications switch
- [ ] Toggle location tracking switch
- [ ] Toggle dark mode switch
- [ ] Edit profile button works (if implemented)
- [ ] Change password button works (if implemented)
- [ ] Help center opens (if implemented)
- [ ] About section shows version
- [ ] Logout confirmation appears
- [ ] Logout redirects to login

### 📱 Navigation Testing
- [ ] Tab navigation works smoothly
- [ ] Dashboard tab icon highlights
- [ ] Settings tab icon highlights
- [ ] Back navigation works (if applicable)
- [ ] Deep linking works (if implemented)
- [ ] No navigation lag or freezing

### 🎨 UI/UX Testing
- [ ] All text is readable
- [ ] Colors are consistent
- [ ] Buttons have proper touch targets
- [ ] Loading states display correctly
- [ ] Error messages are clear
- [ ] Success messages appear
- [ ] Animations are smooth
- [ ] No UI overlap or cutoff
- [ ] Safe areas respected (notches, etc.)
- [ ] Keyboard doesn't cover inputs

### 🔋 Performance Testing
- [ ] App starts within 3 seconds
- [ ] No crashes during normal use
- [ ] Memory usage is reasonable
- [ ] Battery drain is acceptable
- [ ] Map scrolling is smooth (60fps)
- [ ] No lag when adding markers
- [ ] Bottom sheet animates smoothly
- [ ] Images load quickly

### 📶 Network Testing
- [ ] Works on WiFi
- [ ] Works on cellular data
- [ ] Handles slow network gracefully
- [ ] Shows loading states
- [ ] Displays error for no connection
- [ ] Retries failed requests
- [ ] Caches data appropriately

## 🔒 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] API keys not hardcoded
- [ ] Row Level Security enabled in Supabase
- [ ] User data is isolated (RLS policies)
- [ ] Passwords are hashed (Supabase handles)
- [ ] HTTPS used for all API calls
- [ ] Token refresh works correctly
- [ ] Session expires appropriately
- [ ] No sensitive data in logs

## 📱 Device Testing

### Android Testing
- [ ] Tested on Android emulator
- [ ] Tested on physical Android device
- [ ] Location permission works
- [ ] Maps render correctly
- [ ] Back button behavior correct
- [ ] Status bar styling correct

### iOS Testing
- [ ] Tested on iOS simulator
- [ ] Tested on physical iOS device
- [ ] Location permission works
- [ ] Maps render correctly
- [ ] Navigation gesture works
- [ ] Status bar styling correct

## 🚀 Pre-Production Checklist

- [ ] Remove all console.log statements
- [ ] Remove test/debug code
- [ ] Update app version number
- [ ] Test on minimum supported OS versions
- [ ] Test on different screen sizes
- [ ] Verify all assets are optimized
- [ ] Check app size is reasonable
- [ ] Review privacy policy
- [ ] Review terms of service
- [ ] Prepare app store screenshots
- [ ] Write app description
- [ ] Create promotional materials

## 📝 Documentation Review

- [ ] README.md is up to date
- [ ] QUICK_START.md tested
- [ ] SUPABASE_SETUP.md verified
- [ ] All SQL scripts work
- [ ] API documentation complete
- [ ] Code comments added where needed
- [ ] Architecture diagrams accurate

## 🎯 Final Checks

- [ ] All critical features work
- [ ] No known critical bugs
- [ ] Performance is acceptable
- [ ] UI is polished
- [ ] User flow is smooth
- [ ] Error handling is complete
- [ ] Loading states implemented
- [ ] Success/error messages clear

## 🎉 Ready to Launch!

When all items are checked:
1. ✅ Run final build: `npm run build`
2. ✅ Test production build
3. ✅ Submit to app stores
4. ✅ Monitor crash reports
5. ✅ Gather user feedback
6. ✅ Plan next iteration

---

## 🐛 Common Issues & Solutions

### Issue: Map not showing
**Solution:**
```bash
# Check Google Maps API key
# Verify Maps SDK is enabled
# Check app.json configuration
# Ensure location permissions granted
```

### Issue: Supabase connection failed
**Solution:**
```bash
# Verify .env variables
# Check Supabase project URL
# Verify anon key is correct
# Check network connection
```

### Issue: Location not working
**Solution:**
```bash
# Check device location settings
# Verify app has location permission
# Test on physical device (not simulator)
# Check expo-location installation
```

### Issue: Bottom sheet not appearing
**Solution:**
```bash
# Verify GestureHandler setup
# Check bottom-sheet installation
# Wrap app in GestureHandlerRootView
# Check snapPoints configuration
```

### Issue: Build errors
**Solution:**
```bash
# Clear cache: expo start -c
# Reinstall: rm -rf node_modules && npm install
# Check for dependency conflicts
# Update to latest Expo SDK
```

---

## 📞 Need Help?

- 📚 Check documentation files
- 🔍 Search issues on GitHub
- 💬 Contact: support@qair.com
- 🌐 Visit: expo.dev/docs

**Good luck with your launch! 🚀**
