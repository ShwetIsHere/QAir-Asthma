import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/utils/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/utils/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);
      } else if (data.session) {
        router.replace('/dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <Stack.Screen options={{ headerShown: false }} />
        <ScrollView contentContainerClassName="flex-grow" showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-6 pt-16 pb-10">
            {/* Header */}
            <View className="items-center mb-10">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: colors.glassBorder, borderWidth: 1 }}>
                <Ionicons name="fitness" size={48} color={colors.accent2} />
              </View>
              <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800', marginBottom: 6 }}>
                Welcome Back
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                Sign in to continue monitoring your asthma triggers
              </Text>
            </View>

            {/* Form */}
            <View
              className="mb-8 rounded-3xl p-6"
              style={{ backgroundColor: colors.glass, borderColor: colors.glassBorder, borderWidth: 1 }}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                icon="mail"
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                icon="lock-closed"
                error={errors.password}
              />

              <TouchableOpacity className="items-end mb-6">
                <Text style={{ color: colors.accent2, fontWeight: '600' }}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title={loading ? 'Signing In...' : 'Sign In'}
                onPress={handleLogin}
                disabled={loading}
                className="mb-4"
              />

              {/* Social Login */}
              <View className="flex-row items-center my-6">
                <View className="flex-1 h-[1px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
                <Text style={{ color: colors.textSubtle, marginHorizontal: 12 }}>or continue with</Text>
                <View className="flex-1 h-[1px]" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />
              </View>

              <View className="flex-row justify-center space-x-4">
                <TouchableOpacity
                  className="rounded-2xl p-4 w-20 items-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: colors.glassBorder, borderWidth: 1 }}>
                  <Ionicons name="logo-google" size={26} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="rounded-2xl p-4 w-20 items-center"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: colors.glassBorder, borderWidth: 1 }}>
                  <Ionicons name="logo-apple" size={26} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center items-center pb-8">
              <Text style={{ color: colors.textMuted }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={{ color: colors.accent, fontWeight: '700' }}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
