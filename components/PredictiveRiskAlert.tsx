/**
 * Predictive Risk Alert System - Main Component
 * 
 * This component provides a comprehensive asthma risk monitoring system:
 * 1. Fetches current location
 * 2. Gets real-time environmental data (AQI, weather, pollen)
 * 3. Compares with user's trigger history
 * 4. Sends proactive alerts if conditions match past triggers
 * 5. Supports geofencing for automatic monitoring
 * 
 * NO AI/ML MODELS USED - Pure rule-based logic
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { getCurrentLocation, requestBackgroundLocationPermission, getLocationPermissionStatus } from '@/utils/geofencing';
import { fetchEnvironmentalData, EnvironmentalData } from '@/utils/environmentalDataAPI';
import { checkTriggerSimilarity, RiskAssessment, fetchUserTriggerHistory } from '@/utils/riskAssessment';

export default function PredictiveRiskAlert() {
  const [loading, setLoading] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [environmentalData, setEnvironmentalData] = useState<EnvironmentalData | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [checking, setChecking] = useState(false);
  const [triggerCount, setTriggerCount] = useState(0);

  useEffect(() => {
    initializeComponent();
  }, []);

  /**
   * Initialize component - load saved state and check permissions
   */
  const initializeComponent = async () => {
    await checkPermissions();
    await loadSavedState();
    await loadTriggerCount();
  };

  /**
   * Load saved monitoring state from storage
   */
  const loadSavedState = async () => {
    try {
      const savedState = await AsyncStorage.getItem('risk_monitor_enabled');
      if (savedState === 'true') {
        setMonitoringEnabled(true);
      }
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  };

  /**
   * Load user's trigger count
   */
  const loadTriggerCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const triggers = await fetchUserTriggerHistory(user.id, 100);
        setTriggerCount(triggers.length);
        console.log(`Found ${triggers.length} triggers in history`);
      }
    } catch (error) {
      console.error('Error loading trigger count:', error);
    }
  };

  /**
   * Check if we have necessary permissions
   */
  const checkPermissions = async () => {
    const permissions = await getLocationPermissionStatus();
    setHasLocationPermission(permissions.foreground);
  };

  /**
   * Main function to check current risk level
   * Performs the complete workflow:
   * 1. Get location
   * 2. Fetch environmental data
   * 3. Compare with trigger history
   * 4. Display alert if risky
   */
  const checkCurrentRisk = async () => {
    try {
      setChecking(true);
      console.log('=== Starting Risk Check ===');

      // Step 1: Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to use risk monitoring');
        return;
      }

      // Step 2: Get current location
      console.log('Step 1: Getting current location...');
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          'Location Required',
          'Please enable location services to check asthma risk in your area.'
        );
        return;
      }

      setCurrentLocation({ lat: location.latitude, lon: location.longitude });
      console.log(`Location: ${location.latitude}, ${location.longitude}`);

      // Step 3: Fetch environmental data (AQI, weather, pollen)
      console.log('Step 2: Fetching environmental data...');
      const envData = await fetchEnvironmentalData(location.latitude, location.longitude);
      if (!envData) {
        Alert.alert(
          'Data Unavailable',
          'Could not fetch environmental data. Please check your internet connection.'
        );
        return;
      }

      setEnvironmentalData(envData);
      console.log('Environmental data:', {
        aqi: envData.aqi,
        temp: envData.temperature,
        humidity: envData.humidity,
        pollen: envData.pollenLevel,
      });

      // Step 4: Compare with trigger history
      console.log('Step 3: Comparing with trigger history...');
      const assessment = await checkTriggerSimilarity(envData, user.id);
      setRiskAssessment(assessment);
      setLastCheckTime(new Date());

      console.log('Risk Assessment:', {
        isRisky: assessment.isRisky,
        riskLevel: assessment.riskLevel,
        score: assessment.similarityScore,
        matchedTriggers: assessment.matchedTriggers.length,
      });

      // Step 5: Display alert based on risk level
      displayRiskAlert(assessment, envData);

      console.log('=== Risk Check Complete ===');
    } catch (error) {
      console.error('Error in checkCurrentRisk:', error);
      Alert.alert('Error', 'Failed to check risk. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  /**
   * Display appropriate alert based on risk level
   */
  const displayRiskAlert = (assessment: RiskAssessment, envData: EnvironmentalData) => {
    if (assessment.riskLevel === 'high') {
      Alert.alert(
        '🚨 HIGH ASTHMA RISK ALERT',
        `You are in an area with conditions VERY similar to your past asthma triggers!\n\n` +
        `Similarity Score: ${assessment.similarityScore}%\n` +
        `Matched Triggers: ${assessment.matchedTriggers.length}\n\n` +
        `Risk Factors:\n${assessment.riskFactors.slice(0, 3).join('\n')}\n\n` +
        `Recommendations:\n${assessment.recommendations.slice(0, 2).join('\n')}`,
        [
          { text: 'View Details', onPress: () => console.log('Show details') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } else if (assessment.riskLevel === 'medium') {
      Alert.alert(
        '⚠️ Moderate Asthma Risk',
        `Conditions in this area may trigger asthma symptoms.\n\n` +
        `Similarity Score: ${assessment.similarityScore}%\n\n` +
        `Be prepared:\n${assessment.recommendations.slice(0, 2).join('\n')}`,
        [{ text: 'OK' }]
      );
    } else if (assessment.matchedTriggers.length === 0) {
      Alert.alert(
        '📊 No Past Triggers Found',
        `You have ${triggerCount} trigger(s) recorded, but none match current conditions closely.\n\n` +
        `Current Air Quality:\n` +
        `• AQI: ${envData.aqi} (${getAQIInfo(envData.aqi).category})\n` +
        `• Temperature: ${envData.temperature.toFixed(1)}°C\n` +
        `• Humidity: ${envData.humidity}%\n` +
        `• Pollen: ${envData.pollenLevel}\n\n` +
        (triggerCount === 0 
          ? '💡 Start recording triggers on the map to get personalized alerts!'
          : '✅ Conditions look different from your past triggers.'),
        [{ text: 'Got It' }]
      );
    } else {
      Alert.alert(
        '✅ Low Risk',
        `Conditions look safe! The air quality is good.\n\n` +
        `AQI: ${envData.aqi}\n` +
        `Temperature: ${envData.temperature}°C\n` +
        `Humidity: ${envData.humidity}%`,
        [{ text: 'Great!' }]
      );
    }
  };

  /**
   * Toggle automatic monitoring
   */
  const toggleMonitoring = async (enabled: boolean) => {
    if (enabled) {
      // Request background permissions for continuous monitoring
      const granted = await requestBackgroundLocationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Background location permission is needed for automatic risk monitoring.\n\n⚠️ If you see an error, you need to rebuild the app:\n\n1. Run: npx expo prebuild --clean\n2. Run: npx expo run:android\n\nFor now, you can use "Check Risk Now" manually.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Save state and perform first check
      setMonitoringEnabled(true);
      await AsyncStorage.setItem('risk_monitor_enabled', 'true');
      await checkCurrentRisk();
      
      Alert.alert(
        'Monitoring Enabled ✅',
        'QAir will check your asthma risk automatically as you move around.\n\nYour monitoring preference is saved and will persist.',
        [{ text: 'Great!' }]
      );
    } else {
      setMonitoringEnabled(false);
      await AsyncStorage.setItem('risk_monitor_enabled', 'false');
      Alert.alert(
        'Monitoring Disabled', 
        'Automatic risk checking has been turned off.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Get risk level color
   */
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  /**
   * Get AQI category and color
   */
  const getAQIInfo = (aqi: number) => {
    if (aqi <= 50) return { category: 'Good', color: '#10B981' };
    if (aqi <= 100) return { category: 'Moderate', color: '#F59E0B' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive', color: '#F97316' };
    if (aqi <= 200) return { category: 'Unhealthy', color: '#EF4444' };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: '#9333EA' };
    return { category: 'Hazardous', color: '#7C2D12' };
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-indigo-600 p-6 pb-8 rounded-b-3xl">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <Ionicons name="shield-checkmark" size={32} color="white" />
              <Text className="text-white text-2xl font-bold ml-3">Risk Monitor</Text>
            </View>
            {triggerCount > 0 && (
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-semibold">
                  {triggerCount} trigger{triggerCount !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-indigo-100 text-sm">
            {triggerCount === 0 
              ? 'Record triggers on the map to get personalized alerts'
              : `Analyzing ${triggerCount} past trigger${triggerCount !== 1 ? 's' : ''} for risk prediction`}
          </Text>
        </View>

        {/* Auto-Monitoring Toggle */}
        <View className="bg-white mx-5 mt-5 rounded-2xl p-5 shadow-md" style={{ elevation: 4 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-gray-900 font-bold text-lg">Automatic Monitoring</Text>
              <Text className="text-gray-500 text-sm mt-1">
                Get alerts when entering risky areas
              </Text>
            </View>
            <Switch
              value={monitoringEnabled}
              onValueChange={toggleMonitoring}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
              thumbColor={monitoringEnabled ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Manual Check Button */}
        <TouchableOpacity
          onPress={checkCurrentRisk}
          disabled={checking}
          className="bg-indigo-600 mx-5 mt-5 rounded-2xl p-5 shadow-md flex-row items-center justify-center"
          style={{ elevation: 4 }}>
          {checking ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="search" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-3">Check Risk Now</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Current Risk Status */}
        {riskAssessment && (
          <View className="bg-white mx-5 mt-5 rounded-2xl p-5 shadow-md" style={{ elevation: 4 }}>
            <Text className="text-gray-900 font-bold text-xl mb-4">Current Risk Level</Text>
            
            <View
              className="rounded-2xl p-6 mb-4"
              style={{ backgroundColor: getRiskColor(riskAssessment.riskLevel) + '20' }}>
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="font-bold text-2xl"
                  style={{ color: getRiskColor(riskAssessment.riskLevel) }}>
                  {riskAssessment.riskLevel.toUpperCase()}
                </Text>
                <Text className="text-gray-600 text-lg">{riskAssessment.similarityScore}% match</Text>
              </View>
              
              <Text className="text-gray-700">
                {riskAssessment.matchedTriggers.length} similar trigger(s) found
              </Text>
            </View>

            {riskAssessment.riskFactors.length > 0 && (
              <View className="mb-4">
                <Text className="text-gray-900 font-bold mb-2">Risk Factors:</Text>
                {riskAssessment.riskFactors.map((factor, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
                    <Text className="text-gray-600 text-sm ml-2 flex-1">{factor}</Text>
                  </View>
                ))}
              </View>
            )}

            {riskAssessment.recommendations.length > 0 && (
              <View>
                <Text className="text-gray-900 font-bold mb-2">Recommendations:</Text>
                {riskAssessment.recommendations.map((rec, index) => (
                  <View key={index} className="flex-row items-start mb-2">
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
                    <Text className="text-gray-600 text-sm ml-2 flex-1">{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Environmental Data */}
        {environmentalData && (
          <View className="bg-white mx-5 mt-5 rounded-2xl p-5 shadow-md" style={{ elevation: 4 }}>
            <Text className="text-gray-900 font-bold text-xl mb-4">Current Conditions</Text>
            
            <View className="space-y-3">
              {/* AQI */}
              <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
                <View className="flex-row items-center">
                  <Ionicons name="cloud" size={24} color="#6366F1" />
                  <Text className="text-gray-700 font-semibold ml-3">Air Quality</Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-900 font-bold text-lg">{environmentalData.aqi}</Text>
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: getAQIInfo(environmentalData.aqi).color }}>
                    {getAQIInfo(environmentalData.aqi).category}
                  </Text>
                </View>
              </View>

              {/* Temperature */}
              <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
                <View className="flex-row items-center">
                  <Ionicons name="thermometer" size={24} color="#F97316" />
                  <Text className="text-gray-700 font-semibold ml-3">Temperature</Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg">{environmentalData.temperature}°C</Text>
              </View>

              {/* Humidity */}
              <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
                <View className="flex-row items-center">
                  <Ionicons name="water" size={24} color="#3B82F6" />
                  <Text className="text-gray-700 font-semibold ml-3">Humidity</Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg">{environmentalData.humidity}%</Text>
              </View>

              {/* Pollen */}
              <View className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl">
                <View className="flex-row items-center">
                  <Ionicons name="flower" size={24} color="#EC4899" />
                  <Text className="text-gray-700 font-semibold ml-3">Pollen Level</Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg capitalize">
                  {environmentalData.pollenLevel.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Last Check Time */}
        {lastCheckTime && (
          <View className="mx-5 mt-3 mb-6">
            <Text className="text-gray-400 text-sm text-center">
              Last checked: {lastCheckTime.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* Info Box */}
        <View className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mx-5 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-900 font-bold mb-1">How it works</Text>
              <Text className="text-blue-800 text-sm">
                This system compares current environmental conditions (AQI, temperature, humidity, pollen) 
                with your past asthma trigger history using rule-based logic. No AI models used.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
