import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type LoadingScreenProps = {
  message?: string;
};

export const LoadingScreen = ({ message = 'Loading...' }: LoadingScreenProps) => {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#6366F1" />
      <Text className="text-gray-600 text-base mt-4">{message}</Text>
    </View>
  );
};
