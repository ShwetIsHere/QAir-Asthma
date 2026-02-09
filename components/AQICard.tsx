import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/theme';

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
    if (value <= 50) return '#35C1A1';
    if (value <= 100) return '#60A5FA';
    if (value <= 150) return '#FACC15';
    if (value <= 200) return '#F87171';
    if (value <= 300) return '#EF4444';
    return '#991B1B';
  };

  const getAQITextColor = (value: number) => {
    if (value <= 50) return '#35C1A1';
    if (value <= 100) return '#60A5FA';
    if (value <= 150) return '#FACC15';
    if (value <= 200) return '#F87171';
    if (value <= 300) return '#EF4444';
    return '#991B1B';
  };

  return (
    <View
      className="rounded-3xl p-6"
      style={{
        backgroundColor: colors.glass,
        borderColor: colors.glassBorder,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 6,
      }}>
      {/* AQI Header */}
      <View className="items-center mb-6">
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
          Air Quality Index
        </Text>
        <View
          className="w-32 h-32 rounded-full justify-center items-center"
          style={{ backgroundColor: getAQIColor(aqi), shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12 }}>
          <Text style={{ color: colors.text, fontSize: 44, fontWeight: '800' }}>{aqi}</Text>
        </View>
        <Text style={{ color: getAQITextColor(aqi), fontSize: 18, fontWeight: '700', marginTop: 12 }}>
          {category}
        </Text>
      </View>

      {/* Pollutant Details */}
      <View className="space-y-3">
        <View
          className="flex-row justify-between items-center rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
          <View className="flex-row items-center">
            <Ionicons name="cloud" size={24} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>PM 2.5</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{pm25} μg/m³</Text>
        </View>

        <View
          className="flex-row justify-between items-center rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
          <View className="flex-row items-center">
            <Ionicons name="cloud-outline" size={24} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>PM 10</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{pm10} μg/m³</Text>
        </View>

        <View
          className="flex-row justify-between items-center rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
          <View className="flex-row items-center">
            <Ionicons name="thermometer" size={24} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Temperature</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{temperature}°C</Text>
        </View>

        <View
          className="flex-row justify-between items-center rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
          <View className="flex-row items-center">
            <Ionicons name="water" size={24} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontWeight: '600', marginLeft: 12 }}>Humidity</Text>
          </View>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{humidity}%</Text>
        </View>
      </View>
    </View>
  );
});
