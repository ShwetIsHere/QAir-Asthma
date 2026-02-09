import { useEffect } from 'react';
import { Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/utils/theme';

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
    <LinearGradient colors={gradients.screen} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent2} />
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>
        Loading QAir...
      </Text>
    </LinearGradient>
  );
}
