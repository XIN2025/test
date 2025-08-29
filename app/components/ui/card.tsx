import React from 'react';
import { View, ViewProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <View className={twMerge('rounded-2xl bg-white p-0 shadow-lg', className)} {...props}>
      {children}
    </View>
  );
}

export default Card;
