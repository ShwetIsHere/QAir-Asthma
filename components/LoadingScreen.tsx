import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/utils/theme';

type LoadingScreenProps = {
  message?: string;
};

export const LoadingScreen = ({ message = 'Loading...' }: LoadingScreenProps) => {
  return (
    <LinearGradient colors={gradients.screen} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.accent2} />
      <Text style={{ color: colors.textMuted, fontSize: 16, marginTop: 16 }}>{message}</Text>
    </LinearGradient>
  );
};
