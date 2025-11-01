# QAir - Asthma Monitoring App

<div align="center">
  <h3>Track Your Asthma Triggers with Location-Based Air Quality Monitoring</h3>
  <p>A modern React Native mobile application for asthma patients to monitor and track inhaler usage with real-time air quality data.</p>
</div>

## 🌟 Features

### ✅ Authentication System
- **Modern Login/Register UI** with form validation
- **Supabase Authentication** integration
- **Secure password** handling
- **Social login options** (Google, Apple - ready for integration)

### 🗺️ Interactive Map Dashboard
- **Google Maps integration** with custom markers
- **Real-time location tracking**
- **Inhaler trigger markers** - tap to record when you use your inhaler
- **Red zone visualization** - automatically identifies high-risk areas (5+ triggers within 500m)
- **User location indicator**
- **Map controls** - zoom, center on location

### 🌡️ Air Quality Monitoring
- **Real-time AQI (Air Quality Index)** data
- **PM2.5 and PM10** pollution levels
- **Temperature and humidity** tracking
- **Beautiful data visualization** with color-coded indicators
- **🤖 AI-Powered Health Recommendations** - Get personalized health advice based on current weather conditions using Google Gemini 2.0 Flash
- **Historical data** for all trigger locations

### ⚙️ Settings & Profile
- **User profile management**
- **Push notifications** toggle
- **Location tracking** preferences
- **Dark mode** support (ready)
- **Data export** functionality
- **Privacy controls**

### 🎨 Modern UI/UX
- **Beautiful gradient designs**
- **Smooth animations**
- **Bottom sheet** for marker details
- **Custom icons** and components
- **Responsive layouts**
- **Tailwind CSS** styling with NativeWind

## 📱 Screenshots

*(Add your app screenshots here)*

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)
- Supabase account
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   cd "f:\Asthma Native\QAir"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_OPENROUTER_API_KEY=your_openrouter_api_key
   ```
   
   **Important**: For AI health analysis to work, you MUST add your OpenRouter API key!
   - Get a FREE API key from: https://openrouter.ai/keys
   - See `OPENROUTER_SETUP.md` for detailed instructions

4. **Setup Supabase Database**
   
   Follow the instructions in `SUPABASE_SETUP.md` to create the required tables.

5. **Configure Google Maps**
   
   - Update `app.json` with your Google Maps API key
   - For iOS: Add key to `ios.config.googleMapsApiKey`
   - For Android: Add key to `android.config.googleMaps.apiKey`

6. **Start the development server**
   ```bash
   npm start
   ```

7. **Run on your device**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

## 🏗️ Project Structure

```
QAir/
├── app/
│   ├── (tabs)/              # Tab navigation screens
│   │   ├── dashboard.tsx    # Main map dashboard
│   │   └── settings.tsx     # Settings screen
│   ├── _layout.tsx          # Root layout with auth
│   ├── login.tsx            # Login screen
│   └── register.tsx         # Registration screen
├── components/
│   ├── AQICard.tsx          # Air quality display card
│   ├── Button.tsx           # Custom button component
│   ├── Card.tsx             # Reusable card component
│   ├── Container.tsx        # Safe area container
│   ├── Input.tsx            # Custom input field
│   └── LoadingScreen.tsx    # Loading state component
├── utils/
│   ├── supabase.ts          # Supabase client config
│   └── airQuality.ts        # Air quality API service
└── assets/                  # Images and icons
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL scripts from `SUPABASE_SETUP.md`
3. Enable Row Level Security (RLS) policies
4. Add your Supabase URL and anon key to `.env`

### Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (optional)
4. Create credentials and add to your project

### Air Quality API (Optional)

The app uses OpenWeatherMap API for air quality data:
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your API key
3. Add to `.env` file

Alternatively, the app will use mock data if no API key is provided.

## 📊 Database Schema

### inhaler_triggers
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to auth.users)
- `latitude`: Double Precision
- `longitude`: Double Precision
- `timestamp`: Timestamp
- `aqi`: Integer
- `category`: Text
- `pm25`: Double Precision
- `pm10`: Double Precision
- `temperature`: Double Precision
- `humidity`: Double Precision

### user_settings
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `notifications_enabled`: Boolean
- `location_tracking_enabled`: Boolean
- `dark_mode_enabled`: Boolean
- `aqi_alert_threshold`: Integer

## 🎯 Key Features Explained

### Red Zone Detection
The app automatically identifies "red zones" - areas where you've used your inhaler 5 or more times within a 500-meter radius. These zones are highlighted on the map with red circles, helping you avoid high-risk areas.

### Air Quality Monitoring
When you record an inhaler trigger, the app captures:
- Current AQI (Air Quality Index)
- PM2.5 and PM10 levels
- Temperature and humidity
- Location coordinates

### Health Recommendations
Based on current air quality, the app provides personalized recommendations for outdoor activities.

## 🛠️ Tech Stack

- **React Native** - Cross-platform mobile development
- **Expo** - Development framework and tooling
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **NativeWind** - Tailwind CSS for React Native
- **Supabase** - Backend and authentication
- **Google Maps** - Map visualization
- **React Native Maps** - Native map component
- **Bottom Sheet** - Smooth bottom sheet interactions
- **Axios** - HTTP client for API calls

## 📝 Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS device/simulator
npm run web        # Run on web browser
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenWeatherMap for air quality data
- Google Maps for mapping services
- Supabase for backend services
- Expo team for amazing development tools

## 📞 Support

For support, email support@qair.com or create an issue in this repository.

## 🔜 Roadmap

- [ ] Push notifications for high AQI areas
- [ ] Weekly/monthly reports
- [ ] Share triggers with healthcare providers
- [ ] Medication reminders
- [ ] Community features
- [ ] Offline mode
- [ ] Apple Health / Google Fit integration

---

Made with ❤️ for asthma patients worldwide
