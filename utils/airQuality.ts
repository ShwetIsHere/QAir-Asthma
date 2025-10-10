import axios from 'axios';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

export interface AirQualityData {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windSpeed180m: number;
  windDirection: number;
  precipitation: number;
  rain: number;
  showers: number;
  cloudCover: number;
  surfacePressure: number;
  pressureMsl: number;
  weatherCode: number;
  weatherDescription: string;
  feelsLike: number;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
}

/**
 * Get weather description from WMO weather code
 */
const getWeatherDescription = (code: number): string => {
  const weatherCodes: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return weatherCodes[code] || 'Unknown';
};

/**
 * Calculate estimated AQI from weather conditions
 * Since Open-Meteo doesn't provide air quality, we estimate based on weather
 */
const estimateAQI = (
  temperature: number,
  humidity: number,
  windSpeed: number,
  cloudCover: number
): number => {
  // Base AQI (assume moderate)
  let aqi = 75;

  // Higher wind speed generally means better air dispersion (lower AQI)
  if (windSpeed > 5) {
    aqi -= 15;
  } else if (windSpeed < 2) {
    aqi += 15;
  }

  // Higher humidity can trap pollutants
  if (humidity > 70) {
    aqi += 10;
  } else if (humidity < 30) {
    aqi += 5;
  }

  // Temperature inversions can trap pollution
  if (temperature < 5 || temperature > 35) {
    aqi += 10;
  }

  // Cloudy conditions can indicate stagnant air
  if (cloudCover > 70) {
    aqi += 5;
  }

  // Keep AQI in valid range
  return Math.max(0, Math.min(500, Math.round(aqi)));
};

/**
 * Calculate estimated PM2.5 from AQI
 */
const estimatePM25FromAQI = (aqi: number): number => {
  const breakpoints = [
    { aqiLow: 0, aqiHigh: 50, cLow: 0, cHigh: 12.0 },
    { aqiLow: 51, aqiHigh: 100, cLow: 12.1, cHigh: 35.4 },
    { aqiLow: 101, aqiHigh: 150, cLow: 35.5, cHigh: 55.4 },
    { aqiLow: 151, aqiHigh: 200, cLow: 55.5, cHigh: 150.4 },
    { aqiLow: 201, aqiHigh: 300, cLow: 150.5, cHigh: 250.4 },
    { aqiLow: 301, aqiHigh: 500, cLow: 250.5, cHigh: 500.4 },
  ];

  for (const bp of breakpoints) {
    if (aqi >= bp.aqiLow && aqi <= bp.aqiHigh) {
      const pm25 =
        ((bp.cHigh - bp.cLow) / (bp.aqiHigh - bp.aqiLow)) * (aqi - bp.aqiLow) + bp.cLow;
      return Math.round(pm25 * 10) / 10;
    }
  }

  return 35.0; // Default moderate value
};

/**
 * Calculate dew point from temperature and humidity
 */
const calculateDewPoint = (temperature: number, humidity: number): number => {
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
  const dewPoint = (b * alpha) / (a - alpha);
  return Math.round(dewPoint * 10) / 10;
};

/**
 * Get AQI category based on AQI value (US EPA standard)
 */
const getAQICategory = (aqi: number): string => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

/**
 * Calculate AQI from PM2.5 concentration
 * Using US EPA standard
 */
const calculateAQIFromPM25 = (pm25: number): number => {
  const breakpoints = [
    { cLow: 0, cHigh: 12.0, aqiLow: 0, aqiHigh: 50 },
    { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
    { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
    { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
    { cLow: 250.5, cHigh: 500.4, aqiLow: 301, aqiHigh: 500 },
  ];

  for (const bp of breakpoints) {
    if (pm25 >= bp.cLow && pm25 <= bp.cHigh) {
      const aqi =
        ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.aqiLow;
      return Math.round(aqi);
    }
  }

  return 500; // Maximum AQI
};

/**
 * Fetch weather and air quality data from Open-Meteo API
 */
export const fetchAirQuality = async (
  latitude: number,
  longitude: number
): Promise<AirQualityData> => {
  try {
    const response = await axios.get(OPEN_METEO_BASE_URL, {
      params: {
        latitude: latitude,
        longitude: longitude,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'precipitation',
          'rain',
          'showers',
          'cloud_cover',
          'surface_pressure',
          'pressure_msl',
          'wind_speed_10m',
          'wind_direction_10m',
        ].join(','),
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'precipitation',
          'cloud_cover',
          'wind_speed_180m',
          'wind_direction_10m',
          'weather_code',
        ].join(','),
        daily: 'uv_index_max',
        timezone: 'auto',
        forecast_days: 7,
      },
    });

    const current = response.data.current;
    const daily = response.data.daily;
    const hourly = response.data.hourly;

    const temperature = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const windSpeed = Math.round(current.wind_speed_10m * 10) / 10;
    const windSpeed180m = hourly.wind_speed_180m ? Math.round(hourly.wind_speed_180m[0] * 10) / 10 : 0;
    const windDirection = current.wind_direction_10m;
    const precipitation = current.precipitation || 0;
    const rain = current.rain || 0;
    const showers = current.showers || 0;
    const cloudCover = current.cloud_cover;
    const surfacePressure = Math.round(current.surface_pressure);
    const pressureMsl = current.pressure_msl ? Math.round(current.pressure_msl) : surfacePressure;
    const weatherCode = hourly.weather_code[0] || 0;
    const uvIndex = daily.uv_index_max[0] || 0;

    // Estimate AQI from weather conditions
    const aqi = estimateAQI(temperature, humidity, windSpeed, cloudCover);
    const pm25 = estimatePM25FromAQI(aqi);
    const pm10 = Math.round(pm25 * 1.5 * 10) / 10;

    // Calculate derived values
    const feelsLike = temperature - (windSpeed > 5 ? 2 : 0);
    const dewPoint = calculateDewPoint(temperature, humidity);
    const visibility = cloudCover < 30 ? 10.0 : cloudCover < 70 ? 7.0 : 5.0;

    return {
      aqi,
      category: getAQICategory(aqi),
      pm25,
      pm10,
      temperature,
      humidity,
      windSpeed,
      windSpeed180m,
      windDirection,
      precipitation,
      rain,
      showers,
      cloudCover,
      surfacePressure,
      pressureMsl,
      weatherCode,
      weatherDescription: getWeatherDescription(weatherCode),
      feelsLike,
      uvIndex: Math.round(uvIndex * 10) / 10,
      visibility,
      dewPoint,
    };
  } catch (error) {
    console.error('Error fetching weather data from Open-Meteo:', error);
    // Throw error instead of returning mock data
    throw new Error('Failed to fetch weather data. Please check your internet connection.');
  }
};

/**
 * Generate mock air quality data for testing
 */
export const getMockAirQualityData = (): AirQualityData => {
  const temperature = Math.floor(Math.random() * 20) + 15;
  const humidity = Math.floor(Math.random() * 60) + 30;
  const windSpeed = Math.random() * 8 + 2;
  const cloudCover = Math.floor(Math.random() * 100);
  const aqi = estimateAQI(temperature, humidity, windSpeed, cloudCover);
  const pm25 = estimatePM25FromAQI(aqi);

  return {
    aqi,
    category: getAQICategory(aqi),
    pm25,
    pm10: Math.round(pm25 * 1.5 * 10) / 10,
    temperature,
    humidity,
    windSpeed: Math.round(windSpeed * 10) / 10,
    windSpeed180m: 0,
    windDirection: Math.floor(Math.random() * 360),
    precipitation: 0,
    rain: 0,
    showers: 0,
    cloudCover,
    surfacePressure: 1013,
    pressureMsl: 1013,
    weatherCode: 2,
    weatherDescription: 'Partly cloudy',
    feelsLike: temperature - 1,
    uvIndex: 2,
    visibility: 10.0,
    dewPoint: calculateDewPoint(temperature, humidity),
  };
};

/**
 * Get health recommendations based on AQI
 */
export const getHealthRecommendations = (aqi: number): string[] => {
  if (aqi <= 50) {
    return ['Air quality is good. Enjoy outdoor activities!'];
  } else if (aqi <= 100) {
    return [
      'Air quality is acceptable.',
      'Sensitive individuals should consider limiting prolonged outdoor exertion.',
    ];
  } else if (aqi <= 150) {
    return [
      'Unhealthy for sensitive groups.',
      'People with asthma should limit outdoor exertion.',
      'Keep your inhaler nearby.',
    ];
  } else if (aqi <= 200) {
    return [
      'Unhealthy air quality.',
      'Everyone should reduce prolonged outdoor exertion.',
      'People with asthma should avoid outdoor activities.',
    ];
  } else if (aqi <= 300) {
    return [
      'Very unhealthy air quality.',
      'Everyone should avoid prolonged outdoor exertion.',
      'Stay indoors and keep windows closed.',
    ];
  } else {
    return [
      'Hazardous air quality!',
      'Everyone should avoid all outdoor activities.',
      'Stay indoors and use air purifiers if available.',
    ];
  }
};

/**
 * Get place name from coordinates using OpenStreetMap Nominatim API
 */
export const getPlaceName = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await axios.get(GEOCODING_BASE_URL, {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
      },
      headers: {
        'User-Agent': 'QAir-Asthma-App/1.0',
      },
    });

    const address = response.data.address;
    if (address) {
      // Build place name from available data
      const parts = [];
      if (address.city || address.town || address.village) {
        parts.push(address.city || address.town || address.village);
      }
      if (address.state) parts.push(address.state);
      if (address.country) parts.push(address.country);
      
      return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
    }
    
    return 'Unknown Location';
  } catch (error) {
    console.error('Error fetching place name:', error);
    // Return coordinates as fallback
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};
