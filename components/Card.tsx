import React from 'react';
import { View, ViewProps } from 'react-native';
import { colors } from '@/utils/theme';

type CardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
} & ViewProps;

export const Card = React.memo(({ children, variant = 'default', className, ...props }: CardProps) => {
  const variantStyles = {
    default: 'rounded-3xl p-5',
    outlined: 'rounded-3xl p-5',
    elevated: 'rounded-3xl p-5',
  };

  return (
    <View
      {...props}
      className={`${variantStyles[variant]} ${className || ''}`}
      style={[
        {
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
          borderWidth: 1,
        },
        variant === 'outlined' && { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
        variant === 'elevated' && {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        props.style,
      ]}>
      {children}
    </View>
  );
});
