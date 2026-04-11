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
import { colors, gradients } from '@/utils/theme';

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
  const [analysisAttempted, setAnalysisAttempted] = useState(false);

  const latitude = parseFloat(params.latitude as string);
  const longitude = parseFloat(params.longitude as string);
  const timestamp = params.timestamp as string;

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      if (isMounted) {
        await loadWeatherData();
        await loadPlaceName();
      }
    };
    
    initialize();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      setWeatherData(null);
      setAiAnalysis('');
      setHourlyForecast([]);
      setError(null);
    };
  }, []);

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
    
    setAnalysisAttempted(true);
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
      // Keep UX calm: avoid technical errors and guide user to retry.
      Alert.alert('Please wait', 'Please wait for a few seconds and tap Suggestions again.');
      setAiAnalysis('');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return { bg: '#35C1A1', text: 'Good' };
    if (aqi <= 100) return { bg: '#60A5FA', text: 'Moderate' };
    if (aqi <= 150) return { bg: '#FACC15', text: 'Unhealthy for Sensitive' };
    if (aqi <= 200) return { bg: '#F87171', text: 'Unhealthy' };
    if (aqi <= 300) return { bg: '#EF4444', text: 'Very Unhealthy' };
    return { bg: '#991B1B', text: 'Hazardous' };
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.screen} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent2} />
        <Text style={{ color: colors.textMuted, marginTop: 16 }}>Loading weather data...</Text>
      </LinearGradient>
    );
  }

  if (error || !weatherData) {
    return (
      <LinearGradient colors={gradients.screen} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Ionicons name="cloud-offline" size={64} color="#EF4444" />
        <Text className="text-slate-100 text-xl font-bold mt-4 text-center">
          Unable to Load Weather Data
        </Text>
        <Text className="text-slate-300 text-base mt-2 text-center">
          {error || 'Failed to fetch weather information. Please check your internet connection and try again.'}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            loadWeatherData();
          }}
          className="px-8 py-4 rounded-2xl mt-6"
          style={{ backgroundColor: colors.accent2 }}>
          <Text className="text-white font-bold text-base">Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4">
          <Text style={{ color: colors.accent, fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const aqiInfo = weatherData ? getAQIColor(weatherData.aqi) : { bg: '#6B7280', text: 'Unknown' };

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Location Weather',
          headerShown: true,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Location Info Banner */}
        <View className="px-5 py-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderBottomColor: colors.glassBorder, borderBottomWidth: 1 }}>
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
        <View className="mx-5 mt-5 bg-white/10 rounded-3xl p-6 shadow-md" style={{ elevation: 4, borderColor: colors.glassBorder, borderWidth: 1 }}>
          <Text className="text-slate-100 text-xl font-bold mb-4">Air Quality Details</Text>
          
          <View className="flex-row justify-between items-center mb-4 bg-white/5 rounded-2xl p-4">
            <View>
              <Text className="text-slate-300 text-sm">PM 2.5</Text>
              <Text className="text-slate-100 text-2xl font-bold">{weatherData?.pm25}</Text>
              <Text className="text-slate-400 text-xs">μg/m³</Text>
            </View>
            <View className="h-12 w-px bg-white/10" />
            <View>
              <Text className="text-slate-300 text-sm">PM 10</Text>
              <Text className="text-slate-100 text-2xl font-bold">{weatherData?.pm10}</Text>
              <Text className="text-slate-400 text-xs">μg/m³</Text>
            </View>
            <View className="h-12 w-px bg-white/10" />
            <View>
              <Text className="text-slate-300 text-sm">AQI</Text>
              <Text className="text-slate-100 text-2xl font-bold">{weatherData?.aqi}</Text>
              <Text className="text-slate-400 text-xs">{aqiInfo.text}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={loadAIAnalysis}
            disabled={analysisLoading}
            className="rounded-2xl px-4 py-3 mb-4"
            style={{
              backgroundColor: analysisLoading ? 'rgba(53, 193, 161, 0.35)' : 'rgba(53, 193, 161, 0.85)',
              alignItems: 'center',
            }}>
            <Text className="text-white font-bold text-sm">
              {analysisLoading ? 'Generating Suggestions...' : 'Suggestions'}
            </Text>
          </TouchableOpacity>

          {/* AI-Powered Location Analysis - Manual trigger via Suggestions button */}
          {analysisLoading ? (
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: colors.glassBorder }}>
              <View className="flex-row items-center mb-2">
                <ActivityIndicator size="small" color={colors.accent2} />
                <Text className="text-slate-100 font-semibold ml-2 text-sm">Analyzing with AI...</Text>
              </View>
              <Text className="text-slate-300 text-xs">
                Fetching real-time health assessment from Gemini based on current weather data...
              </Text>
            </View>
          ) : aiAnalysis ? (
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: colors.glassBorder }}>
              <View className="flex-row items-center mb-2">
                <Ionicons name="sparkles" size={18} color={colors.accent2} />
                <Text className="text-slate-100 font-semibold ml-2 text-sm">AI Health Assessment</Text>
              </View>
              <Text className="text-slate-100 text-sm leading-5">
                {aiAnalysis}
              </Text>
            </View>
          ) : analysisAttempted ? (
            <View className="rounded-2xl p-4 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)', borderColor: colors.glassBorder }}>
              <Text className="text-slate-300 text-sm leading-5">
                Unable to generate suggestions right now. Please wait for a few seconds and tap Suggestions again.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Additional Weather Info */}
        <View className="mx-5 mt-5 bg-white/10 rounded-3xl p-6 shadow-md mb-6" style={{ elevation: 4, borderColor: colors.glassBorder, borderWidth: 1 }}>
          <Text className="text-slate-100 text-xl font-bold mb-4">Additional Information</Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between items-center py-3 border-b border-white/10">
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color={colors.textSubtle} />
                <Text className="text-slate-300 ml-3">Surface Pressure</Text>
              </View>
              <Text className="text-slate-100 font-semibold">{weatherData?.surfacePressure} hPa</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-white/10">
              <View className="flex-row items-center">
                <Ionicons name="speedometer-outline" size={20} color={colors.textSubtle} />
                <Text className="text-slate-300 ml-3">Pressure (MSL)</Text>
              </View>
              <Text className="text-slate-100 font-semibold">{weatherData?.pressureMsl} hPa</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-white/10">
              <View className="flex-row items-center">
                <Ionicons name="water-outline" size={20} color={colors.textSubtle} />
                <Text className="text-slate-300 ml-3">Dew Point</Text>
              </View>
              <Text className="text-slate-100 font-semibold">{weatherData?.dewPoint}°C</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3 border-b border-white/10">
              <View className="flex-row items-center">
                <Ionicons name="rainy-outline" size={20} color={colors.textSubtle} />
                <Text className="text-slate-300 ml-3">Precipitation</Text>
              </View>
              <Text className="text-slate-100 font-semibold">{weatherData?.precipitation} mm</Text>
            </View>
            
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color={colors.textSubtle} />
                <Text className="text-slate-300 ml-3">Coordinates</Text>
              </View>
              <Text className="text-slate-100 font-semibold">
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* No Precipitation Message */}
        <View className="mx-5 mt-2 rounded-2xl p-4 mb-8 border" style={{ backgroundColor: 'rgba(53, 193, 161, 0.12)', borderColor: 'rgba(53, 193, 161, 0.4)' }}>
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text className="text-green-200 font-semibold ml-3 text-base">
              No precipitation within an hour
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
