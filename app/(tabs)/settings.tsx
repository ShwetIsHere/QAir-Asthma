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
import { Card } from '@/components/Card';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [locationTracking, setLocationTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

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
      className="flex-row items-center py-4 px-5 bg-white mb-3"
      style={{ borderRadius: 16 }}>
      <View 
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: iconBg || '#EEF2FF' }}>
        <Ionicons name={icon} size={24} color={iconColor || '#6366F1'} />
      </View>
      <View className="flex-1 ml-4">
        <Text className="text-gray-900 font-semibold text-base">{title}</Text>
        {subtitle && <Text className="text-gray-400 text-sm mt-1">{subtitle}</Text>}
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: '#6366F1' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Profile Section */}
        <View className="bg-white px-6 pt-8 pb-6 items-center">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center mb-4 border-4 border-indigo-100"
            style={{ backgroundColor: '#6366F1' }}>
            <Text className="text-white text-4xl font-bold">
              {user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'S'}
            </Text>
          </View>
          <Text className="text-gray-400 text-sm mb-6">{user?.email || ''}</Text>
        </View>

        <View className="px-6 mt-6">
          {/* Account Settings */}
          <Text className="text-gray-900 font-bold text-xl mb-4">Account Settings</Text>
          <View className="mb-6">
            <SettingItem
              icon="person-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={() => Alert.alert('Coming Soon', 'Profile editing feature coming soon')}
            />
            <SettingItem
              icon="key-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => Alert.alert('Coming Soon', 'Password change feature coming soon')}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Privacy & Security"
              subtitle="Manage your privacy settings"
              onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon')}
            />
          </View>

          {/* App Preferences */}
          <Text className="text-gray-900 font-bold text-xl mb-4">App Preferences</Text>
          <View className="mb-6">
            <SettingItem
              icon="notifications-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Push Notifications"
              subtitle="Receive alerts about air quality"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                  thumbColor={notifications ? '#6366F1' : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                />
              }
            />
            <SettingItem
              icon="location-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Location Tracking"
              subtitle="Enable automatic location tracking"
              rightElement={
                <Switch
                  value={locationTracking}
                  onValueChange={setLocationTracking}
                  trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                  thumbColor={locationTracking ? '#6366F1' : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                />
              }
            />
            <SettingItem
              icon="moon-outline"
              iconColor="#6366F1"
              iconBg="#EEF2FF"
              title="Dark Mode"
              subtitle="Change app appearance"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#E5E7EB', true: '#A5B4FC' }}
                  thumbColor={darkMode ? '#6366F1' : '#F3F4F6'}
                  ios_backgroundColor="#E5E7EB"
                />
              }
            />
          </View>

          {/* Data & Storage */}
          <Text className="text-gray-900 font-bold text-xl mb-4">Data & Storage</Text>
          <View className="mb-6">
            <SettingItem
              icon="download-outline"
              iconColor="#10B981"
              iconBg="#D1FAE5"
              title="Export Data"
              subtitle="Download your trigger history"
              onPress={() => Alert.alert('Coming Soon', 'Data export feature coming soon')}
            />
            <SettingItem
              icon="trash-outline"
              iconColor="#F59E0B"
              iconBg="#FEF3C7"
              title="Clear Cache"
              subtitle="Free up storage space"
              onPress={() => Alert.alert('Success', 'Cache cleared successfully')}
            />
          </View>

          {/* Support */}
          <Text className="text-gray-900 font-bold text-xl mb-4">Support</Text>
          <View className="mb-6">
            <SettingItem
              icon="help-circle-outline"
              iconColor="#8B5CF6"
              iconBg="#EDE9FE"
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => Alert.alert('Coming Soon', 'Help center coming soon')}
            />
            <SettingItem
              icon="mail-outline"
              iconColor="#8B5CF6"
              iconBg="#EDE9FE"
              title="Contact Us"
              subtitle="Send us your feedback"
              onPress={() => Alert.alert('Contact', 'Email: support@qair.com')}
            />
            <SettingItem
              icon="information-circle-outline"
              iconColor="#8B5CF6"
              iconBg="#EDE9FE"
              title="About"
              subtitle="Version 1.0.0"
              onPress={() => Alert.alert('QAir', 'Asthma Monitoring App\nVersion 1.0.0')}
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
    </View>
  );
}
