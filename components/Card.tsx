import React from 'react';
import { View, ViewProps } from 'react-native';

type CardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'outlined' | 'elevated';
} & ViewProps;

export const Card = ({ children, variant = 'default', className, ...props }: CardProps) => {
  const variantStyles = {
    default: 'bg-white rounded-3xl p-5',
    outlined: 'bg-white rounded-3xl p-5 border-2 border-gray-200',
    elevated: 'bg-white rounded-3xl p-5 shadow-lg shadow-gray-200',
  };

  return (
    <View {...props} className={`${variantStyles[variant]} ${className || ''}`}>
      {children}
    </View>
  );
};
