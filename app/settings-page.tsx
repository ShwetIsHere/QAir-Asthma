import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/utils/supabase';
import { generateHealthReport } from '@/utils/pdfGenerator';

const APP_VERSION = '1.0.0';

export default function SettingsPage() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Cleanup function to prevent memory leaks
  React.useEffect(() => {
    return () => {
      // Reset all settings states when leaving the page
      setPushNotifications(true);
      setLocationTracking(true);
      setDarkMode(false);
    };
  }, []);

  const handlePrivacySecurity = () => {
    Alert.alert(
      'Privacy & Security',
      'Your data is encrypted and stored securely. We never share your personal information with third parties.\n\n• End-to-end encryption\n• Secure cloud storage\n• GDPR compliant\n• No data selling',
      [{ text: 'OK' }]
    );
  };

  const handlePushNotificationToggle = async (value: boolean) => {
    setPushNotifications(value);
    await AsyncStorage.setItem('pushNotifications', JSON.stringify(value));
    
    if (value) {
      Alert.alert('Notifications Enabled', 'You will receive air quality alerts and reminders.');
    } else {
      Alert.alert('Notifications Disabled', 'You won\'t receive any notifications.');
    }
  };

  const handleLocationTrackingToggle = async (value: boolean) => {
    setLocationTracking(value);
    await AsyncStorage.setItem('locationTracking', JSON.stringify(value));
    
    if (value) {
      Alert.alert('Location Tracking Enabled', 'The app will track your location for better trigger analysis.');
    } else {
      Alert.alert('Location Tracking Disabled', 'Location tracking has been disabled.');
    }
  };

  const handleDarkModeToggle = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('darkMode', JSON.stringify(value));
    Alert.alert('Dark Mode', value ? 'Dark mode will be available in the next update!' : 'Light mode enabled');
  };

  const handleExportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to export data');
        return;
      }

      try {
        Alert.alert('Generating Report', 'Please wait while we create your comprehensive health report with AI insights...');

        // Fetch all user triggers
        const { data: triggers, error } = await supabase
          .from('inhaler_triggers')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });

        if (error) throw error;

        if (!triggers || triggers.length === 0) {
          Alert.alert('No Data', 'You don\'t have any trigger data to export yet.');
          return;
        }

        // Calculate stats
        const validAqi = triggers.filter(t => t.aqi).map(t => t.aqi!);
        const avgAqi = validAqi.length > 0 
          ? Math.round(validAqi.reduce((sum, aqi) => sum + aqi, 0) / validAqi.length)
          : 0;

        const firstDate = new Date(triggers[triggers.length - 1].timestamp);
        const lastDate = new Date(triggers[0].timestamp);
        const dateRange = `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`;

        // Get user info
        const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
        const userEmail = user.email || 'No email';

        // Get OpenRouter API key
        const openRouterApiKey = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';

        // Generate PDF
        await generateHealthReport({
          userName,
          userEmail,
          triggers,
          totalTriggers: triggers.length,
          avgAqi,
          dateRange,
        }, openRouterApiKey);

        Alert.alert('Success', 'Health report generated and ready to share!');
      } catch (error: any) {
        console.error('PDF generation error:', error);
        
        // Check if it's the specific Expo Go limitation error
        if (error?.message?.includes('development build')) {
          // Error already shown by pdfGenerator, just return
          return;
        }
        
        Alert.alert(
          'Error', 
          'Failed to generate PDF report. Please try again or use a development build for full PDF support.'
        );
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache & Restart',
      'This will clear all cached data and restart the app fresh. Your trigger data will be preserved in the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Restart',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage cache
              await AsyncStorage.clear();
              
              // Show success message
              Alert.alert(
                'Success', 
                'Cache cleared! App will restart now.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Force reload the app
                      if (typeof window !== 'undefined' && window.location) {
                        window.location.reload();
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.error('Clear cache error:', error);
              Alert.alert('Error', 'Failed to clear cache. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleHelpCenter = () => {
    Alert.alert(
      'Help Center',
      'Choose an option:',
      [
        {
          text: 'FAQ',
          onPress: () => Alert.alert(
            'Frequently Asked Questions',
            '1. How does the app work?\nThe app tracks your inhaler usage and correlates it with air quality data.\n\n2. Is my data private?\nYes, all data is encrypted and stored securely.\n\n3. How accurate is the AQI?\nWe use real-time data from reliable sources.\n\n4. Can I export my data?\nYes, use the Export Data option in Settings.'
          ),
        },
        {
          text: 'User Guide',
          onPress: () => Alert.alert(
            'User Guide',
            '📍 Map Tab:\n• Tap anywhere to see air quality\n• Record triggers with the blue button\n• View detailed weather info\n\n👤 Profile Tab:\n• View your statistics\n• Check weekly activity\n• See visited places\n• Review trigger history'
          ),
        },
        {
          text: 'Video Tutorials',
          onPress: () => Alert.alert('Coming Soon', 'Video tutorials will be available in the next update!'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleContactUs = () => {
    Alert.alert(
      'Contact Us',
      'Choose a team member to contact:',
      [
        {
          text: 'Shwet Patel',
          onPress: () => Linking.openURL('mailto:patel.s.manojbhai@nuv.ac.in?subject=QAir Support Request'),
        },
        {
          text: 'Jai Jaiswal',
          onPress: () => Linking.openURL('mailto:jay.l.jaiswal@nuv.ac.in?subject=QAir Support Request'),
        },
        {
          text: 'Ujjaval Rathod',
          onPress: () => Linking.openURL('mailto:ujjaval.r.rathod@nuv.ac.in?subject=QAir Support Request'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleAboutApp = () => {
    Alert.alert(
      'About QAir',
      `Version ${APP_VERSION}\n\n🫁 QAir - Smart Asthma Management\n\nQAir is designed specifically for asthma patients to help manage and understand their triggers better.\n\n✨ Key Features:\n• Inhaler Trigger Tracking - Mark locations where you used your inhaler\n• Real-time Air Quality Monitoring - Check AQI, PM2.5, temperature, and humidity\n• AI-Powered Health Insights - Get personalized suggestions about weather conditions\n• Historical Analysis - View your trigger patterns and visited locations\n• Smart Alerts - Receive notifications about poor air quality\n\n📍 How It Works:\n1. When you use your inhaler, tap the map to mark the trigger location\n2. The app records weather conditions and air quality data\n3. AI analyzes if current conditions are suitable for you\n4. View all your triggers and patterns in the Profile tab\n\n👥 Developed by:\nShwet Patel, Jai Jaiswal & Ujjaval Rathod\n\n© 2025 QAir App. All rights reserved.\nMade with ❤️ for better respiratory health.`,
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightComponent 
  }: { 
    icon: any; 
    title: string; 
    subtitle?: string; 
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 px-4 bg-white rounded-2xl mb-3"
      style={{ elevation: 2 }}
      disabled={!onPress && !rightComponent}>
      <View className="flex-row items-center flex-1">
        <View className="bg-indigo-50 w-10 h-10 rounded-xl items-center justify-center mr-4">
          <Ionicons name={icon} size={22} color="#6366F1" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold text-base">{title}</Text>
          {subtitle && (
            <Text className="text-gray-500 text-xs mt-1">{subtitle}</Text>
          )}
        </View>
      </View>
      {rightComponent ? rightComponent : showArrow && (
        <Ionicons name="chevron-forward" size={22} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View className="mb-6">
      <Text className="text-gray-600 font-bold text-sm mb-3 px-2 uppercase tracking-wide">
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              className="ml-4">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6']}
          className="px-6 py-6 mb-5">
          <View className="flex-row items-center">
            <View className="bg-white/20 w-16 h-16 rounded-full items-center justify-center mr-4">
              <Ionicons name="settings" size={32} color="white" />
            </View>
            <View>
              <Text className="text-white text-2xl font-bold">Settings</Text>
              <Text className="text-white/80 text-sm">Customize your experience</Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5">
          {/* Privacy & Security Section */}
          <SettingSection title="Privacy & Security">
            <SettingItem
              icon="shield-checkmark"
              title="Privacy & Security"
              subtitle="View our privacy policy"
              onPress={handlePrivacySecurity}
            />
          </SettingSection>

          {/* Preferences Section */}
          <SettingSection title="Preferences">
            <SettingItem
              icon="notifications"
              title="Push Notifications"
              subtitle="Receive air quality alerts"
              showArrow={false}
              rightComponent={
                <Switch
                  value={pushNotifications}
                  onValueChange={handlePushNotificationToggle}
                  trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                  thumbColor={pushNotifications ? '#6366F1' : '#F3F4F6'}
                />
              }
            />
            <SettingItem
              icon="location"
              title="Location Tracking"
              subtitle="Track your location for triggers"
              showArrow={false}
              rightComponent={
                <Switch
                  value={locationTracking}
                  onValueChange={handleLocationTrackingToggle}
                  trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                  thumbColor={locationTracking ? '#6366F1' : '#F3F4F6'}
                />
              }
            />
            <SettingItem
              icon="moon"
              title="Dark Mode"
              subtitle="Coming soon in next update"
              showArrow={false}
              rightComponent={
                <Switch
                  value={darkMode}
                  onValueChange={handleDarkModeToggle}
                  trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                  thumbColor={darkMode ? '#6366F1' : '#F3F4F6'}
                />
              }
            />
          </SettingSection>

          {/* Data Management Section */}
          <SettingSection title="Data Management">
            <SettingItem
              icon="download"
              title="Export Data"
              subtitle="Download your trigger history"
              onPress={handleExportData}
            />
            <SettingItem
              icon="trash"
              title="Clear Cache"
              subtitle="Free up storage space"
              onPress={handleClearCache}
            />
          </SettingSection>

          {/* Support Section */}
          <SettingSection title="Support">
            <SettingItem
              icon="help-circle"
              title="Help Center"
              subtitle="FAQs and user guide"
              onPress={handleHelpCenter}
            />
            <SettingItem
              icon="mail"
              title="Contact Us"
              subtitle="Get in touch with support"
              onPress={handleContactUs}
            />
          </SettingSection>

          {/* About Section */}
          <SettingSection title="About">
            <SettingItem
              icon="information-circle"
              title="About QAir"
              subtitle={`Version ${APP_VERSION}`}
              onPress={handleAboutApp}
            />
          </SettingSection>
        </View>

        {/* Footer */}
        <View className="items-center py-8">
          <Text className="text-gray-400 text-xs">Made with ❤️ for asthma patients</Text>
          <Text className="text-gray-400 text-xs mt-1">© 2025 QAir App</Text>
        </View>
      </ScrollView>
    </View>
  );
}
