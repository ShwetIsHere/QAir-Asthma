/**
 * Test component to verify Predictive Risk Alert API setup
 * Run this to check if API keys are working correctly
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAirQualityData, fetchWeatherData, fetchPollenData } from '@/utils/environmentalDataAPI';

export default function TestPredictiveRiskAPIs() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    openWeather?: { success: boolean; data?: any; error?: string };
    weather?: { success: boolean; data?: any; error?: string };
    pollen?: { success: boolean; data?: any; error?: string };
  }>({});

  // Test coordinates (New York City)
  const TEST_LAT = 40.7128;
  const TEST_LON = -74.0060;

  const runTests = async () => {
    setTesting(true);
    setResults({});

    console.log('🧪 Starting API tests...');

    // Test 1: OpenWeather Air Quality API
    console.log('Test 1: Fetching air quality data...');
    try {
      const aqiData = await fetchAirQualityData(TEST_LAT, TEST_LON);
      if (aqiData) {
        console.log('✅ Air Quality API working:', aqiData);
        setResults(prev => ({
          ...prev,
          openWeather: { success: true, data: aqiData }
        }));
      } else {
        throw new Error('No data returned');
      }
    } catch (error: any) {
      console.error('❌ Air Quality API failed:', error.message);
      setResults(prev => ({
        ...prev,
        openWeather: { success: false, error: error.message }
      }));
    }

    // Test 2: OpenWeather Weather API
    console.log('Test 2: Fetching weather data...');
    try {
      const weatherData = await fetchWeatherData(TEST_LAT, TEST_LON);
      if (weatherData) {
        console.log('✅ Weather API working:', weatherData);
        setResults(prev => ({
          ...prev,
          weather: { success: true, data: weatherData }
        }));
      } else {
        throw new Error('No data returned');
      }
    } catch (error: any) {
      console.error('❌ Weather API failed:', error.message);
      setResults(prev => ({
        ...prev,
        weather: { success: false, error: error.message }
      }));
    }

    // Test 3: Ambee Pollen API
    console.log('Test 3: Fetching pollen data...');
    try {
      const pollenData = await fetchPollenData(TEST_LAT, TEST_LON);
      if (pollenData) {
        console.log('✅ Pollen API working:', pollenData);
        setResults(prev => ({
          ...prev,
          pollen: { success: true, data: pollenData }
        }));
      } else {
        throw new Error('No data returned');
      }
    } catch (error: any) {
      console.error('⚠️ Pollen API failed (optional):', error.message);
      setResults(prev => ({
        ...prev,
        pollen: { success: false, error: error.message }
      }));
    }

    console.log('🧪 Tests complete!');
    setTesting(false);
  };

  const getStatusIcon = (success?: boolean) => {
    if (success === undefined) return '⏳';
    return success ? '✅' : '❌';
  };

  const getStatusColor = (success?: boolean) => {
    if (success === undefined) return '#9CA3AF';
    return success ? '#10B981' : '#EF4444';
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-indigo-600 p-6 pb-8 rounded-b-3xl">
          <View className="flex-row items-center mb-2">
            <Ionicons name="flask" size={32} color="white" />
            <Text className="text-white text-2xl font-bold ml-3">API Test Suite</Text>
          </View>
          <Text className="text-indigo-100 text-sm">
            Verify Predictive Risk Alert APIs are configured correctly
          </Text>
        </View>

        {/* Test Button */}
        <TouchableOpacity
          onPress={runTests}
          disabled={testing}
          className="bg-indigo-600 mx-5 mt-5 rounded-2xl p-5 shadow-md flex-row items-center justify-center"
          style={{ elevation: 4 }}>
          {testing ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-bold text-lg ml-3">Testing APIs...</Text>
            </>
          ) : (
            <>
              <Ionicons name="play" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-3">Run All Tests</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Test Results */}
        {Object.keys(results).length > 0 && (
          <View className="mx-5 mt-5">
            {/* OpenWeather Air Quality Test */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-md" style={{ elevation: 4 }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{getStatusIcon(results.openWeather?.success)}</Text>
                  <Text className="text-gray-900 font-bold text-lg">OpenWeather AQI API</Text>
                </View>
              </View>
              
              {results.openWeather?.success ? (
                <View className="bg-green-50 rounded-xl p-3">
                  <Text className="text-green-800 font-semibold mb-1">✅ Working Correctly</Text>
                  <Text className="text-green-700 text-sm">
                    AQI: {results.openWeather.data.aqi}
                  </Text>
                  <Text className="text-green-700 text-sm">
                    PM2.5: {results.openWeather.data.pm25} μg/m³
                  </Text>
                  <Text className="text-green-700 text-sm">
                    PM10: {results.openWeather.data.pm10} μg/m³
                  </Text>
                </View>
              ) : (
                <View className="bg-red-50 rounded-xl p-3">
                  <Text className="text-red-800 font-semibold mb-1">❌ Failed</Text>
                  <Text className="text-red-700 text-sm">
                    Error: {results.openWeather?.error || 'Unknown error'}
                  </Text>
                  <Text className="text-red-600 text-xs mt-2">
                    Check: API key in .env file, internet connection, API quota
                  </Text>
                </View>
              )}
            </View>

            {/* OpenWeather Weather Test */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-md" style={{ elevation: 4 }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{getStatusIcon(results.weather?.success)}</Text>
                  <Text className="text-gray-900 font-bold text-lg">OpenWeather Data API</Text>
                </View>
              </View>
              
              {results.weather?.success ? (
                <View className="bg-green-50 rounded-xl p-3">
                  <Text className="text-green-800 font-semibold mb-1">✅ Working Correctly</Text>
                  <Text className="text-green-700 text-sm">
                    Temperature: {results.weather.data.temperature}°C
                  </Text>
                  <Text className="text-green-700 text-sm">
                    Humidity: {results.weather.data.humidity}%
                  </Text>
                </View>
              ) : (
                <View className="bg-red-50 rounded-xl p-3">
                  <Text className="text-red-800 font-semibold mb-1">❌ Failed</Text>
                  <Text className="text-red-700 text-sm">
                    Error: {results.weather?.error || 'Unknown error'}
                  </Text>
                </View>
              )}
            </View>

            {/* Ambee Pollen Test */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-md" style={{ elevation: 4 }}>
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-2">{getStatusIcon(results.pollen?.success)}</Text>
                  <Text className="text-gray-900 font-bold text-lg">Ambee Pollen API</Text>
                </View>
                <View className="bg-blue-100 px-2 py-1 rounded">
                  <Text className="text-blue-700 text-xs font-semibold">Optional</Text>
                </View>
              </View>
              
              {results.pollen?.success ? (
                <View className="bg-green-50 rounded-xl p-3">
                  <Text className="text-green-800 font-semibold mb-1">✅ Working Correctly</Text>
                  <Text className="text-green-700 text-sm">
                    Pollen Count: {results.pollen.data.pollenCount}
                  </Text>
                  <Text className="text-green-700 text-sm">
                    Level: {results.pollen.data.pollenLevel}
                  </Text>
                </View>
              ) : (
                <View className="bg-yellow-50 rounded-xl p-3">
                  <Text className="text-yellow-800 font-semibold mb-1">⚠️ Not Available</Text>
                  <Text className="text-yellow-700 text-sm">
                    {results.pollen?.error || 'Pollen API is optional'}
                  </Text>
                  <Text className="text-yellow-600 text-xs mt-2">
                    System will use default pollen values (low)
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Instructions */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-5 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-900 font-bold mb-1">Test Instructions</Text>
              <Text className="text-blue-800 text-sm">
                1. Tap "Run All Tests" to verify your API keys{'\n'}
                2. All tests should show ✅ (except Ambee which is optional){'\n'}
                3. If you see ❌, check your .env file and API keys{'\n'}
                4. Restart Expo dev server after changing .env
              </Text>
            </View>
          </View>
        </View>

        {/* API Key Info */}
        <View className="bg-white rounded-2xl p-5 mx-5 mb-6 shadow-md" style={{ elevation: 4 }}>
          <Text className="text-gray-900 font-bold text-lg mb-3">Current API Configuration</Text>
          
          <View className="space-y-2">
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-gray-600 text-xs mb-1">OpenWeather API Key</Text>
              <Text className="text-gray-900 font-mono text-xs">
                {process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.substring(0, 20)}...
              </Text>
            </View>
            
            <View className="bg-gray-50 rounded-xl p-3">
              <Text className="text-gray-600 text-xs mb-1">Ambee API Key</Text>
              <Text className="text-gray-900 font-mono text-xs">
                {process.env.EXPO_PUBLIC_AMBEE_API_KEY?.substring(0, 20)}...
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
