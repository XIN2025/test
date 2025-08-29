import React from 'react';
import { View, ViewStyle, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/utils/spacing';

interface DashboardCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: keyof typeof spacing | number;
  margin?: keyof typeof spacing | number;
  style?: ViewStyle;
  touchable?: boolean;
}

/**
 * Reusable card component for dashboard pages with consistent styling
 */
export function DashboardCard({
  children,
  variant = 'default',
  padding = 'md',
  margin = 0,
  style,
  touchable = false,
  ...touchableProps
}: DashboardCardProps) {
  const { isDarkMode } = useTheme();

  const getPaddingValue = (value: keyof typeof spacing | number): number => {
    return typeof value === 'number' ? value : spacing[value];
  };

  const getMarginValue = (value: keyof typeof spacing | number): number => {
    return typeof value === 'number' ? value : spacing[value];
  };

  const getVariantStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      padding: getPaddingValue(padding),
      margin: getMarginValue(margin),
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 4,
          elevation: 3,
        };

      case 'outlined':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#111827' : '#ffffff',
          borderWidth: 1,
          borderColor: isDarkMode ? '#374151' : '#e5e7eb',
        };

      case 'flat':
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
        };

      default: // 'default'
        return {
          ...baseStyle,
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDarkMode ? 0.2 : 0.05,
          shadowRadius: 2,
          elevation: 1,
        };
    }
  };

  const cardStyle: ViewStyle = {
    ...getVariantStyles(),
    ...style,
  };

  if (touchable) {
    return (
      <TouchableOpacity style={cardStyle} activeOpacity={0.7} {...touchableProps}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}
