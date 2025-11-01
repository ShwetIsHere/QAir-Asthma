import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchAirQuality, getPlaceName } from '@/utils/airQuality';
import { analyzeLocationSuitability } from '@/utils/openrouter';

type WeatherData = {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
  feelsLike: number;
  windSpeed: number;
  windSpeed180m: number;
  windDirection: number;
  precipitation: number;
  rain: number;
  showers: number;
  cloudCover: number;
  surfacePressure: number;
  pressureMsl: number;
  uvIndex: number;
  visibility: number;
  dewPoint: number;
  weatherDescription: string;
  weatherCode: number;
};

export default function TriggerDetails() {
  const params = useLocalSearchParams();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [placeName, setPlaceName] = useState<string>('Loading location...');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<any[]>([]);

  const latitude = parseFloat(params.latitude as string);
  const longitude = parseFloat(params.longitude as string);
  const timestamp = params.timestamp as string;

  useEffect(() => {
    loadWeatherData();
    loadPlaceName();
    
    // Cleanup function to prevent memory leaks
    return () => {
      setWeatherData(null);
      setAiAnalysis('');
      setHourlyForecast([]);
    };
  }, []);

  useEffect(() => {
    // Load AI analysis after weather data is available
    let isMounted = true;
    
    if (weatherData && isMounted) {
      loadAIAnalysis();
    }
    
    return () => {
      isMounted = false;
    };
  }, [weatherData]);

  const loadPlaceName = async () => {
    try {
      const name = await getPlaceName(latitude, longitude);
      setPlaceName(name);
    } catch (error) {
      console.error('Error loading place name:', error);
      setPlaceName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  };

  const loadWeatherData = async () => {
    try {
      setError(null);
      const data = await fetchAirQuality(latitude, longitude);
      setWeatherData({
        ...data,
      });
      
      // Mock hourly forecast
      setHourlyForecast([
        { time: '12pm', temp: 20, precipitation: 0 },
        { time: '1pm', temp: 20, precipitation: 0 },
        { time: '2pm', temp: 18, precipitation: 0 },
        { time: '3pm', temp: 18, precipitation: 0 },
        { time: '4pm', temp: 18, precipitation: 0 },
        { time: '5pm', temp: 18, precipitation: 0 },
        { time: '6pm', temp: 16, precipitation: 0 },
        { time: '7pm', temp: 16, precipitation: 0 },
      ]);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading weather:', error);
      setError(error.message || 'Failed to load weather data. Please check your internet connection.');
      setLoading(false);
    }
  };

  const loadAIAnalysis = async () => {
    if (!weatherData) return;
    
    setAnalysisLoading(true);
    setAiAnalysis(''); // Clear previous analysis
    
    try {
      console.log('Loading AI analysis for location...');
      const analysis = await analyzeLocationSuitability({
        aqi: weatherData.aqi,
        category: weatherData.category,
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        pm25: weatherData.pm25,
        pm10: weatherData.pm10,
        uvIndex: weatherData.uvIndex,
        weatherDescription: weatherData.weatherDescription,
        placeName: placeName,
      });
      
      console.log('AI analysis loaded successfully');
      setAiAnalysis(analysis);
    } catch (error: any) {
      console.error('Error loading AI analysis:', error);
      
      // Show detailed error to user
      let errorMessage = 'AI Analysis Unavailable';
      let errorDetails = error?.message || 'Failed to get AI health assessment.';
      
      // Add helpful tips based on error type
      if (errorDetails.includes('API key')) {
        errorDetails += '\n\nPlease check that EXPO_PUBLIC_OPENROUTER_API_KEY is set in your environment variables.';
      } else if (errorDetails.includes('internet') || errorDetails.includes('Network')) {
        errorDetails += '\n\nPlease check your internet connection and try again.';
      } else if (errorDetails.includes('credits') || errorDetails.includes('402')) {
        errorDetails += '\n\nThe free tier may have usage limits. Please try again later.';
      }
      
      Alert.alert(
        errorMessage,
        errorDetails,
        [{ text: 'OK' }]
      );
      setAiAnalysis(''); // Don't show any preloaded text
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return { bg: '#10B981', text: 'Good' };
    if (aqi <= 100) return { bg: '#F59E0B', text: 'Moderate' };
    if (aqi <= 150) return { bg: '#F97316', text: 'Unhealthy for Sensitive' };
    if (aqi <= 200) return { bg: '#EF4444', text: 'Unhealthy' };
    if (aqi <= 300) return { bg: '#9333EA', text: 'Very Unhealthy' };
    return { bg: '#7C2D12', text: 'Hazardous' };
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
        <Text className="text-gray-600 mt-4">Loading weather data...</Text>
      </View>
    );
  }

  if (error || !weatherData) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Ionicons name="cloud-offline" size={64} color="#EF4444" />
        <Text className="text-gray-900 text-xl font-bold mt-4 text-center">
          Unable to Load Weather Data
        </Text>
        <Text className="text-gray-600 text-base mt-2 text-center">
          {error || 'Failed to fetch weather information. Please check your internet connection and try again.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            loadWeatherData();
          }}
          className="bg-indigo-500 px-8 py-4 rounded-2xl mt-6">
          <Text className="text-white font-bold text-base">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4">
          <Text className="text-indigo-500 font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const aqiInfo = weatherData ? getAQIColor(weatherData.aqi) : { bg: '#6B7280', text: 'Unknown' };

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Location Weather',
          headerShown: true,
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Location Info Banner */}
        <View className="bg-blue-500 px-5 py-4">
          <Text className="text-white/80 text-sm">
            {new Date(timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons name="location" size={24} color="white" />
            <Text className="text-white text-2xl font-bold ml-2 flex-1">
              {placeName}
            </Text>
          </View>
        </View>

        {/* Main Weather Card */}
        <LinearGradient
          colors={[aqiInfo.bg, aqiInfo.bg + 'CC']}
          className="mx-5 mt-5 rounded-3xl p-6 shadow-lg"
          style={{ elevation: 8 }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Ionicons name="partly-sunny" size={48} color="white" />
              <Text className="text-white text-6xl font-bold mt-3">
                {weatherData?.temperature}°C
              </Text>
              <Text className="text-white/90 text-lg mt-2">
                Feels like {weatherData?.feelsLike}°C
              </Text>
              <Text className="text-white/80 text-base mt-1">
                {weatherData?.weatherDescription}
              </Text>
            </View>
            <View className="items-end">
              <View className="bg-white/20 px-4 py-2 rounded-xl">
                <Text className="text-white text-xs font-semibold">AQI</Text>
                <Text className="text-white text-3xl font-bold">{weatherData?.aqi}</Text>
                <Text className="text-white/90 text-xs">{aqiInfo.text}</Text>
              </View>
            </View>
          </View>

          {/* Weather Details Grid */}
          <View className="mt-6 flex-row flex-wrap justify-between">
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="water" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Humidity</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.humidity}%</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="speedometer" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Wind (10m)</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.windSpeed} m/s</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="speedometer" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Wind (180m)</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.windSpeed180m} m/s</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="rainy" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Rain</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.rain} mm</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="rainy" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Showers</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.showers} mm</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="cloud" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Cloud Cover</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.cloudCover}%</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="sunny" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">UV Index</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.uvIndex}</Text>
            </View>
            <View className="bg-white/20 rounded-xl p-3 mb-3" style={{ width: '48%' }}>
              <Ionicons name="eye" size={20} color="white" />
              <Text className="text-white/80 text-xs mt-1">Visibility</Text>
              <Text className="text-white text-xl font-bold">{weatherData?.visibility} km</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Air Quality Details */}
        <View className="mx-5 mt-5 bg-white rounded-3xl p-6 shadow-md" style={{ elevation: 4 }}>
          <Text className="text-gray-900 text-xl font-bold mb-4">Air Quality Details</Text>
          
          <View className="flex-row justify-between items-center mb-4 bg-gray-50 rounded-2xl p-4">
            <View>
              <Text className="text-gray-500 text-sm">PM 2.5</Text>
              <Text className="text-gray-900 text-2xl font-bold">{weatherData?.pm25}</Text>
              <Text className="text-gray-400 text-xs">μg/m³</Text>
            </View>
            <View className="h-12 w-px bg-gray-200" />
            <View>
              <Text className="text-gray-500 text-sm">PM 10</Text>
              <Text className="text-gray-900 text-2xl font-bold">{weatherData?.pm10}</Text>
              <Text className="text-gray-400 text-xs">μg/m³</Text>
            </View>
            <View className="h-12 w-px bg-gray-200" />
            <View>
              <Text className="text-gray-500 text-sm">AQI</Text>
              <Text className="text-gray-900 text-2xl font-bold">{weatherData?.aqi}</Text>
              <Text className="text-gray-400 text-xs">{aqiInfo.text}</Text>
            </View>
          </View>

          {/* AI-Powered Location Analysis - ONLY REAL AI, NO PRELOADED TEXT */}
          {analysisLoading ? (
            <View className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
              <View className="flex-row items-center mb-2">
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text className="text-purple-900 font-semibold ml-2 text-sm">Analyzing with AI...</Text>
              </View>
              <Text className="text-purple-800 text-xs">
                Fetching real-time health assessment from OpenRouter AI based on current weather data...
              </Text>
            </View>
          ) : aiAnalysis ? (
            <View className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-4 border border-purple-200">
              <View className="flex-row items-center mb-2">
                <Ionicons name="sparkles" size={18} color="#8B5CF6" />
                <Text className="text-purple-900 font-semibold ml-2 text-sm">AI Health Assessment</Text>
              </View>
              <Text className="text-purple-900 text-sm leading-5">
                {aiAnalysis}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Additional Weather Info */}
        <View className="mx-5 mt-5 bg-white rounded-3xl p-6 shadow-md mb-6" style={{ elevation: 4 }}>
          <Text className="text-gray-900 text-xl font-bold mb-4">Additional Information</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color="#6B7280" />
                <Text className="text-gray-600 ml-3">Surface Pressure</Text>
              </View>
              <Text className="text-gray-900 font-semibold">{weatherData?.surfacePressure} hPa</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color="#6B7280" />
                <Text className="text-gray-600 ml-3">Pressure (MSL)</Text>
              </View>
              <Text className="text-gray-900 font-semibold">{weatherData?.pressureMsl} hPa</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="water-outline" size={20} color="#6B7280" />
                <Text className="text-gray-600 ml-3">Dew Point</Text>
              </View>
              <Text className="text-gray-900 font-semibold">{weatherData?.dewPoint}°C</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="rainy-outline" size={20} color="#6B7280" />
                <Text className="text-gray-600 ml-3">Precipitation</Text>
              </View>
              <Text className="text-gray-900 font-semibold">{weatherData?.precipitation} mm</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text className="text-gray-600 ml-3">Coordinates</Text>
              </View>
              <Text className="text-gray-900 font-semibold">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* No Precipitation Message */}
        <View className="mx-5 mt-2 bg-green-50 rounded-2xl p-4 mb-8 border border-green-200">
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text className="text-green-900 font-semibold ml-3 text-base">
              No precipitation within an hour
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
