import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/utils/theme';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(user);
      }
    };
    
    loadData();

    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      // Clear user state when leaving settings
      setUser(null);
      setNotifications(true);
      setLocationTracking(true);
      setDarkMode(false);
    };
  }, []);



  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    iconColor,
    iconBg,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    iconColor?: string;
    iconBg?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-4 px-5 bg-white/10 mb-3"
      style={{ borderRadius: 16, borderColor: colors.glassBorder, borderWidth: 1 }}>
      <View 
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: iconBg || 'rgba(255, 255, 255, 0.12)' }}>
        <Ionicons name={icon} size={24} color={iconColor || colors.accent2} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-slate-100 font-semibold text-base">{title}</Text>
        {subtitle && <Text className="text-slate-400 text-sm mt-1">{subtitle}</Text>}
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />}
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Section */}
        <View className="px-6 pt-8 pb-6 items-center">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.accent2, borderColor: colors.glassBorder, borderWidth: 1 }}>
            <Text className="text-white text-4xl font-bold">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'S'}
            </Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>{user?.email || ''}</Text>
        </View>

        <View className="px-6 mt-6">
          {/* Account Settings */}
          <Text className="text-slate-100 font-bold text-xl mb-4">Account Settings</Text>
          <View className="mb-6">
            <SettingItem
              icon="person-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing feature coming soon')}
            />
            <SettingItem
              icon="key-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Change Password"
              subtitle="Update your password"
              onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Privacy & Security"
              subtitle="Manage your privacy settings"
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon')}
            />
          </View>

          {/* App Preferences */}
          <Text className="text-slate-100 font-bold text-xl mb-4">App Preferences</Text>
          <View className="mb-6">
            <SettingItem
              icon="notifications-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Push Notifications"
              subtitle="Receive alerts about air quality"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.18)', true: colors.accent }}
                  thumbColor={notifications ? colors.accent2 : '#E5E7EB'}
                  ios_backgroundColor="rgba(255, 255, 255, 0.18)"
                />
              }
            />
            <SettingItem
              icon="location-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Location Tracking"
              subtitle="Enable automatic location tracking"
              rightElement={
                <Switch
                  value={locationTracking}
                  onValueChange={setLocationTracking}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.18)', true: colors.accent }}
                  thumbColor={locationTracking ? colors.accent2 : '#E5E7EB'}
                  ios_backgroundColor="rgba(255, 255, 255, 0.18)"
                />
              }
            />
            <SettingItem
              icon="moon-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(255, 255, 255, 0.12)'}
              title="Dark Mode"
              subtitle="Change app appearance"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.18)', true: colors.accent }}
                  thumbColor={darkMode ? colors.accent2 : '#E5E7EB'}
                  ios_backgroundColor="rgba(255, 255, 255, 0.18)"
                />
              }
            />
          </View>

          {/* Data & Storage */}
          <Text className="text-slate-100 font-bold text-xl mb-4">Data & Storage</Text>
          <View className="mb-6">
            <SettingItem
              icon="download-outline"
              iconColor={colors.accent}
              iconBg={'rgba(53, 193, 161, 0.18)'}
              title="Export Data"
              subtitle="Download your trigger history"
              onPress={() => Alert.alert('Coming Soon', 'Data export feature coming soon')}
            />
            <SettingItem
              icon="trash-outline"
              iconColor={colors.warning}
              iconBg={'rgba(250, 204, 21, 0.2)'}
              title="Clear Cache"
              subtitle="Clear all cached data and restart fresh"
              onPress={() => Alert.alert(
                'Clear Cache & Restart',
                'This will clear all cached data and restart the app. Your trigger data will be preserved.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear & Restart',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
                        await AsyncStorage.clear();
                        Alert.alert('Success', 'Cache cleared! App will restart now.', [
                          {
                            text: 'OK',
                            onPress: () => {
                              if (typeof window !== 'undefined' && window.location) {
                                window.location.reload();
                              }
                            }
                          }
                        ]);
                      } catch (error) {
                        Alert.alert('Error', 'Failed to clear cache');
                      }
                    }
                  }
                ]
              )}
            />
          </View>

          {/* Support */}
          <Text className="text-slate-100 font-bold text-xl mb-4">Support</Text>
          <View className="mb-6">
            <SettingItem
              icon="help-circle-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(77, 163, 255, 0.15)'}
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => Alert.alert('Coming Soon', 'Help center coming soon')}
            />
            <SettingItem
              icon="mail-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(77, 163, 255, 0.15)'}
              title="Contact Us"
              subtitle="Send us your feedback"
              onPress={() => Alert.alert(
                'Contact Us',
                'Choose a team member to contact:',
                [
                  {
                    text: 'Shwet Patel',
                    onPress: () => {
                      const { Linking } = require('react-native');
                      Linking.openURL('mailto:patel.s.manojbhai@nuv.ac.in?subject=QAir Support Request');
                    }
                  },
                  {
                    text: 'Jai Jaiswal',
                    onPress: () => {
                      const { Linking } = require('react-native');
                      Linking.openURL('mailto:jay.l.jaiswal@nuv.ac.in?subject=QAir Support Request');
                    }
                  },
                  {
                    text: 'Ujjaval Rathod',
                    onPress: () => {
                      const { Linking } = require('react-native');
                      Linking.openURL('mailto:ujjaval.r.rathod@nuv.ac.in?subject=QAir Support Request');
                    }
                  },
                  { text: 'Cancel', style: 'cancel' }
                ]
              )}
            />
            <SettingItem
              icon="information-circle-outline"
              iconColor={colors.accent2}
              iconBg={'rgba(77, 163, 255, 0.15)'}
              title="About"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert(
                'About QAir',
                '🫁 QAir - Smart Asthma Management\n\nVersion 1.0.0\n\nQAir is designed for asthma patients to help manage and understand their triggers.\n\n✨ Features:\n• Inhaler Trigger Tracking\n• Real-time Air Quality Monitoring\n• AI-Powered Health Insights\n• Historical Analysis\n• Smart Alerts\n\n📍 How It Works:\n1. Mark trigger location when using inhaler\n2. App records weather & air quality\n3. AI analyzes conditions for you\n4. View patterns in Profile tab\n\n👥 Developed by:\nShwet Patel, Jai Jaiswal & Ujjaval Rathod\n\n© 2025 QAir App. Made with ❤️',
                [{ text: 'OK' }]
              )}
            />
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500 py-5 rounded-2xl items-center mb-8 shadow-lg"
            style={{ elevation: 5 }}>
            <View className="flex-row items-center">
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text className="text-white font-bold text-lg ml-2">Logout</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
