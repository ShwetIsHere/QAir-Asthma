import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type InputProps = {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
} & TextInputProps;

export const Input = ({ label, error, icon, secureTextEntry, ...props }: InputProps) => {
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View className="mb-4">
      {label && <Text className="text-gray-700 font-semibold mb-2 text-base">{label}</Text>}
      <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 border-2 border-gray-200 focus:border-indigo-500">
        {icon && (
          <Ionicons name={icon} size={20} color="#6B7280" style={{ marginRight: 10 }} />
        )}
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          className="flex-1 py-4 text-base text-gray-900"
          placeholderTextColor="#9CA3AF"
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)}>
            <Ionicons name={isSecure ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-500 text-sm mt-1 ml-1">{error}</Text>}
    </View>
  );
};
