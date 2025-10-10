import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';

export default function Index() {
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      router.replace('/(tabs)/dashboard');
    } else {
      router.replace('/login');
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-indigo-500">
      <ActivityIndicator size="large" color="#fff" />
      <Text className="text-white text-xl font-bold mt-4">Loading QAir...</Text>
    </View>
  );
}
