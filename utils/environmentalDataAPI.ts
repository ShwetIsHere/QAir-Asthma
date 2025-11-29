// Environmental Data API Service
// Fetches real-time AQI, weather, and pollen data from public APIs

import axios from 'axios';

// API Keys - You need to get these from respective services
// OpenWeather: https://openweathermap.org/api
// Ambee: https://www.getambee.com/
const OPENWEATHER_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_KEY';
const AMBEE_API_KEY = process.env.EXPO_PUBLIC_AMBEE_API_KEY || 'YOUR_AMBEE_KEY';

export type EnvironmentalData = {
  latitude: number;
  longitude: number;
  aqi: number;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  pollenCount: number;
  pollenLevel: 'low' | 'medium' | 'high' | 'very_high';
  timestamp: string;
};

/**
 * Fetch Air Quality Index (AQI) data from OpenWeather API
 * @param lat Latitude
 * @param lon Longitude
 * @returns Air quality data including AQI, PM2.5, PM10
 */
export const fetchAirQualityData = async (
  lat: number,
  lon: number
): Promise<{ aqi: number; pm25: number; pm10: number } | null> => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/air_pollution`,
      {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (response.data && response.data.list && response.data.list[0]) {
      const airData = response.data.list[0];
      return {
        aqi: airData.main.aqi * 50, // Convert OpenWeather scale (1-5) to AQI scale (0-500)
        pm25: airData.components.pm2_5 || 0,
        pm10: airData.components.pm10 || 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return null;
  }
};

/**
 * Fetch weather data (temperature, humidity) from OpenWeather API
 * @param lat Latitude
 * @param lon Longitude
 * @returns Weather data including temperature and humidity
 */
export const fetchWeatherData = async (
  lat: number,
  lon: number
): Promise<{ temperature: number; humidity: number } | null> => {
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: OPENWEATHER_API_KEY,
          units: 'metric', // Celsius
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.main) {
      return {
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
};

/**
 * Fetch pollen count data from Ambee API
 * @param lat Latitude
 * @param lon Longitude
 * @returns Pollen data including count and level
 */
export const fetchPollenData = async (
  lat: number,
  lon: number
): Promise<{ pollenCount: number; pollenLevel: 'low' | 'medium' | 'high' | 'very_high' } | null> => {
  try {
    // If no valid Ambee key, skip external call and return safe defaults
    if (!AMBEE_API_KEY || AMBEE_API_KEY === 'YOUR_AMBEE_KEY') {
      // Pollen is optional; avoid noisy errors when key isn't configured
      return { pollenCount: 0, pollenLevel: 'low' };
    }
    const response = await axios.get(
      `https://api.ambeedata.com/latest/pollen/by-lat-lng`,
      {
        params: {
          lat,
          lng: lon,
        },
        headers: {
          'x-api-key': AMBEE_API_KEY,
          'Content-type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.data && response.data.data[0]) {
      const pollenData = response.data.data[0];
      const totalCount = 
        (pollenData.Count?.grass_pollen || 0) +
        (pollenData.Count?.tree_pollen || 0) +
        (pollenData.Count?.weed_pollen || 0);

      // Classify pollen level based on total count
      let level: 'low' | 'medium' | 'high' | 'very_high' = 'low';
      if (totalCount > 200) level = 'very_high';
      else if (totalCount > 100) level = 'high';
      else if (totalCount > 50) level = 'medium';

      return {
        pollenCount: totalCount,
        pollenLevel: level,
      };
    }

    return null;
  } catch (error: any) {
    // Quiet fallback: return defaults without warning spam
    return {
      pollenCount: 0,
      pollenLevel: 'low',
    };
  }
};

/**
 * Fetch all environmental data for a location
 * Combines AQI, weather, and pollen data
 * @param lat Latitude
 * @param lon Longitude
 * @returns Complete environmental data
 */
export const fetchEnvironmentalData = async (
  lat: number,
  lon: number
): Promise<EnvironmentalData | null> => {
  try {
    console.log(`Fetching environmental data for location: ${lat}, ${lon}`);

    // Fetch all data in parallel for better performance
    const [airQuality, weather, pollen] = await Promise.all([
      fetchAirQualityData(lat, lon),
      fetchWeatherData(lat, lon),
      fetchPollenData(lat, lon),
    ]);

    // If we couldn't get air quality or weather, return null
    if (!airQuality || !weather) {
      console.error('Failed to fetch essential environmental data');
      return null;
    }

    const environmentalData: EnvironmentalData = {
      latitude: lat,
      longitude: lon,
      aqi: airQuality.aqi,
      pm25: airQuality.pm25,
      pm10: airQuality.pm10,
      temperature: weather.temperature,
      humidity: weather.humidity,
      pollenCount: pollen?.pollenCount || 0,
      pollenLevel: pollen?.pollenLevel || 'low',
      timestamp: new Date().toISOString(),
    };

    console.log('Environmental data fetched successfully:', environmentalData);
    return environmentalData;
  } catch (error) {
    console.error('Error in fetchEnvironmentalData:', error);
    return null;
  }
};

/**
 * Fallback: Use stored AQI data if API fails
 * This can fetch from your existing airQuality.ts utilities
 */
export const fetchFallbackAQI = async (lat: number, lon: number): Promise<number> => {
  // You can integrate with your existing airQuality.ts here
  // For now, return a safe default
  console.warn('Using fallback AQI data');
  return 50; // Moderate AQI as fallback
};
