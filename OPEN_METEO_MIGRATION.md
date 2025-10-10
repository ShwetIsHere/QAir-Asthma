# Open-Meteo API Migration Guide

## 🌤️ Why Open-Meteo?

We've migrated from OpenWeatherMap to **Open-Meteo API** because:

1. ✅ **100% Free** - No API key required, unlimited requests
2. ✅ **No Rate Limits** - Perfect for production apps
3. ✅ **High Quality Data** - Professional-grade weather forecasts
4. ✅ **Open Source** - Transparent and community-driven
5. ✅ **Global Coverage** - Weather data for any location worldwide

---

## 📡 API Endpoints Used

### Base URL
```
https://api.open-meteo.com/v1/forecast
```

### Parameters We Use

```javascript
{
  latitude: 52.52,         // Location latitude
  longitude: 13.41,        // Location longitude
  
  // Current weather conditions (15-minute updates)
  current: [
    'temperature_2m',      // Air temperature at 2 meters
    'relative_humidity_2m', // Relative humidity
    'precipitation',       // Total precipitation
    'rain',               // Rain amount
    'showers',            // Shower amount
    'cloud_cover',        // Cloud cover percentage
    'surface_pressure',    // Surface air pressure
    'wind_speed_10m',     // Wind speed at 10 meters
    'wind_direction_10m', // Wind direction
  ],
  
  // Hourly forecast data
  hourly: [
    'temperature_2m',
    'relative_humidity_2m',
    'precipitation',
    'cloud_cover',
    'wind_speed_180m',    // High-altitude wind
    'wind_direction_10m',
    'weather_code',       // WMO weather code
  ],
  
  // Daily forecast data
  daily: 'uv_index_max',  // Maximum UV index
  
  timezone: 'auto',       // Automatic timezone detection
  forecast_days: 1,       // 1 day forecast
}
```

---

## 🔄 Data Mapping

### Weather Codes (WMO Standard)

| Code | Description |
|------|-------------|
| 0 | Clear sky |
| 1 | Mainly clear |
| 2 | Partly cloudy |
| 3 | Overcast |
| 45, 48 | Fog |
| 51, 53, 55 | Drizzle (light to dense) |
| 61, 63, 65 | Rain (slight to heavy) |
| 71, 73, 75 | Snow (slight to heavy) |
| 80, 81, 82 | Rain showers |
| 95, 96, 99 | Thunderstorm |

### Our Data Structure

```typescript
interface AirQualityData {
  // Air Quality (estimated from weather)
  aqi: number;                    // 0-500 Air Quality Index
  category: string;               // Good, Moderate, Unhealthy, etc.
  pm25: number;                   // Estimated PM2.5 (μg/m³)
  pm10: number;                   // Estimated PM10 (μg/m³)
  
  // Weather from Open-Meteo
  temperature: number;            // °C
  humidity: number;               // %
  windSpeed: number;              // m/s
  windDirection: number;          // degrees
  precipitation: number;          // mm
  cloudCover: number;             // %
  surfacePressure: number;        // hPa
  
  // WMO Weather Code
  weatherCode: number;            // 0-99
  weatherDescription: string;     // Human-readable description
  
  // Calculated values
  feelsLike: number;              // °C (adjusted for wind)
  uvIndex: number;                // 0-11+
  visibility: number;             // km (estimated from cloud cover)
  dewPoint: number;               // °C (calculated)
}
```

---

## 🧮 AQI Estimation Algorithm

Since Open-Meteo doesn't provide air quality data, we **estimate AQI** from weather conditions:

```javascript
function estimateAQI(temperature, humidity, windSpeed, cloudCover) {
  let aqi = 75;  // Base: Moderate air quality
  
  // Wind disperses pollutants
  if (windSpeed > 5) aqi -= 15;      // Good air dispersion
  else if (windSpeed < 2) aqi += 15;  // Stagnant air
  
  // Humidity affects particle suspension
  if (humidity > 70) aqi += 10;       // Traps pollutants
  else if (humidity < 30) aqi += 5;   // Dry air
  
  // Temperature inversions trap pollution
  if (temp < 5 || temp > 35) aqi += 10;
  
  // Cloudy = stagnant air mass
  if (cloudCover > 70) aqi += 5;
  
  return Math.max(0, Math.min(500, aqi));
}
```

**Note:** This is an estimation. For production apps monitoring real air quality, consider adding:
- [IQAir API](https://www.iqair.com/air-pollution-data-api) (requires key)
- [WAQI API](https://aqicn.org/api/) (free token available)
- [OpenAQ](https://openaq.org/) (100% free, open data)

---

## 📊 Response Example

### Sample Request
```
GET https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure&daily=uv_index_max&timezone=auto
```

### Sample Response
```json
{
  "latitude": 52.52,
  "longitude": 13.41,
  "timezone": "Europe/Berlin",
  "current": {
    "time": "2025-10-09T12:00",
    "temperature_2m": 16.2,
    "relative_humidity_2m": 63,
    "wind_speed_10m": 3.1,
    "wind_direction_10m": 270,
    "cloud_cover": 25,
    "surface_pressure": 1027.0,
    "precipitation": 0,
    "rain": 0
  },
  "daily": {
    "time": ["2025-10-09"],
    "uv_index_max": [2.1]
  },
  "hourly": {
    "time": ["2025-10-09T00:00", ...],
    "temperature_2m": [15.0, 16.0, ...],
    "weather_code": [2, 1, ...]
  }
}
```

---

## 🔧 Implementation Files

### Modified Files

1. **`utils/airQuality.ts`**
   - ✅ Replaced OpenWeatherMap API with Open-Meteo
   - ✅ Added weather code descriptions
   - ✅ Implemented AQI estimation algorithm
   - ✅ Added dew point calculation
   - ✅ Updated data structure

2. **`app/trigger-details.tsx`**
   - ✅ Updated to use new data fields
   - ✅ Display surface pressure (instead of pressure_msl)
   - ✅ Show weather description from WMO codes

3. **`app/(tabs)/dashboard.tsx`**
   - ✅ Already compatible (no changes needed)
   - ✅ Uses the same interface

4. **`.env`**
   - ✅ Removed `EXPO_PUBLIC_OPENWEATHER_API_KEY`
   - ✅ Added note about Open-Meteo

---

## ✅ Advantages of This Migration

### Before (OpenWeatherMap)
- ❌ Limited free tier (60 calls/minute, 1,000,000/month)
- ❌ Requires API key management
- ❌ Rate limiting issues
- ❌ Paid plans needed for production

### After (Open-Meteo)
- ✅ **Unlimited API calls**
- ✅ **No API key required**
- ✅ **No rate limits**
- ✅ **Free forever**
- ✅ **Better for production**
- ✅ **More reliable**

---

## 🚀 How to Use

### 1. Fetch Weather Data
```typescript
import { fetchAirQuality } from '@/utils/airQuality';

const data = await fetchAirQuality(latitude, longitude);

console.log(data.temperature);     // 16°C
console.log(data.aqi);             // 75
console.log(data.category);        // "Moderate"
console.log(data.weatherDescription); // "Partly cloudy"
```

### 2. Display on UI
All existing components work automatically:
- Dashboard map with triggers
- Trigger details page
- AQI cards
- Weather cards

---

## 📚 Additional Resources

- [Open-Meteo Documentation](https://open-meteo.com/en/docs)
- [Weather Variable List](https://open-meteo.com/en/docs#weathervariables)
- [WMO Weather Codes](https://www.nodc.noaa.gov/archive/arc0021/0002199/1.1/data/0-data/HTML/WMO-CODE/WMO4677.HTM)
- [API Playground](https://open-meteo.com/en/docs#api_form)

---

## 🐛 Troubleshooting

### Issue: Weather data not loading
**Solution:** Check internet connection. Open-Meteo requires no authentication, so it should always work.

### Issue: AQI seems inaccurate
**Solution:** Remember, AQI is **estimated** from weather conditions, not measured. For real air quality data, integrate a dedicated air quality API.

### Issue: Want historical data
**Solution:** Open-Meteo supports historical weather data:
```
https://archive-api.open-meteo.com/v1/archive?start_date=2025-01-01&end_date=2025-10-09
```

---

## 💡 Future Enhancements

Consider adding:

1. **Real Air Quality Data:**
   - Integrate [OpenAQ API](https://openaq.org/) (free)
   - Add [IQAir API](https://www.iqair.com/air-pollution-data-api) for premium users

2. **Extended Forecasts:**
   - 7-day weather forecast
   - Hourly charts
   - Rain radar

3. **Weather Alerts:**
   - Severe weather warnings
   - Air quality alerts
   - Push notifications

---

**Migration completed successfully! 🎉 Your app now uses free, unlimited weather data from Open-Meteo API.**
