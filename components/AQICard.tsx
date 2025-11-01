import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AQICardProps = {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  temperature: number;
  humidity: number;
};

export const AQICard = React.memo(({ aqi, category, pm25, pm10, temperature, humidity }: AQICardProps) => {
  const getAQIColor = (value: number) => {
    if (value <= 50) return 'bg-green-500';
    if (value <= 100) return 'bg-yellow-500';
    if (value <= 150) return 'bg-orange-500';
    if (value <= 200) return 'bg-red-500';
    if (value <= 300) return 'bg-purple-500';
    return 'bg-red-900';
  };

  const getAQITextColor = (value: number) => {
    if (value <= 50) return 'text-green-600';
    if (value <= 100) return 'text-yellow-600';
    if (value <= 150) return 'text-orange-600';
    if (value <= 200) return 'text-red-600';
    if (value <= 300) return 'text-purple-600';
    return 'text-red-900';
  };

  return (
    <View className="bg-white rounded-3xl p-6 shadow-lg">
      {/* AQI Header */}
      <View className="items-center mb-6">
        <Text className="text-gray-500 text-sm font-medium mb-2">Air Quality Index</Text>
        <View
          className={`w-32 h-32 rounded-full ${getAQIColor(aqi)} justify-center items-center shadow-lg`}>
          <Text className="text-white text-5xl font-bold">{aqi}</Text>
        </View>
        <Text className={`text-xl font-bold mt-3 ${getAQITextColor(aqi)}`}>{category}</Text>
      </View>

      {/* Pollutant Details */}
      <View className="space-y-3">
        <View className="flex-row justify-between items-center bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="cloud" size={24} color="#6B7280" />
            <Text className="text-gray-700 font-semibold ml-3">PM 2.5</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg">{pm25} μg/m³</Text>
        </View>

        <View className="flex-row justify-between items-center bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="cloud-outline" size={24} color="#6B7280" />
            <Text className="text-gray-700 font-semibold ml-3">PM 10</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg">{pm10} μg/m³</Text>
        </View>

        <View className="flex-row justify-between items-center bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="thermometer" size={24} color="#6B7280" />
            <Text className="text-gray-700 font-semibold ml-3">Temperature</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg">{temperature}°C</Text>
        </View>

        <View className="flex-row justify-between items-center bg-gray-50 rounded-2xl p-4">
          <View className="flex-row items-center">
            <Ionicons name="water" size={24} color="#6B7280" />
            <Text className="text-gray-700 font-semibold ml-3">Humidity</Text>
          </View>
          <Text className="text-gray-900 font-bold text-lg">{humidity}%</Text>
        </View>
      </View>
    </View>
  );
});
