import React, { useState } from 'react';
import { Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/utils/theme';

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
      {label && (
        <Text style={{ color: colors.textMuted, fontWeight: '600', marginBottom: 8, fontSize: 15 }}>
          {label}
        </Text>
      )}
      <View
        className="flex-row items-center rounded-2xl px-4"
        style={{
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          borderWidth: 1,
        }}>
        {icon && (
          <Ionicons name={icon} size={20} color={colors.textSubtle} style={{ marginRight: 10 }} />
        )}
        <TextInput
          {...props}
          secureTextEntry={isSecure}
          className="flex-1 py-4 text-base"
          style={{ color: colors.text }}
          placeholderTextColor={colors.textSubtle}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setIsSecure(!isSecure)}>
            <Ionicons name={isSecure ? 'eye-off' : 'eye'} size={20} color={colors.textSubtle} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-red-400 text-sm mt-1 ml-1">{error}</Text>}
    </View>
  );
};
