import React from "react";
import { View, ScrollView, ViewStyle, ScrollViewProps, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showScrollView?: boolean;
  scrollViewProps?: ScrollViewProps;
  headerComponent?: React.ReactNode;
  gradientColors?: string[];
  contentStyle?: ViewStyle;
}

/**
 * Reusable dashboard layout component that handles:
 * - Consistent gradient backgrounds
 * - Proper safe area handling
 * - ScrollView with correct content insets
 * - Bottom tab bar spacing
 */
export function DashboardLayout({
  children,
  showScrollView = true,
  scrollViewProps = {},
  headerComponent,
  gradientColors,
  contentStyle,
}: DashboardLayoutProps) {
  const { isDarkMode } = useTheme();

  const defaultGradientColors = gradientColors || (isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]);

  const defaultContentStyle: ViewStyle = {
    paddingHorizontal: 16,
    paddingTop: headerComponent ? 0 : 16,
    paddingBottom: 100, // Space for bottom tab bar + extra padding
    ...contentStyle,
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={defaultGradientColors} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {headerComponent}
        {showScrollView ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={defaultContentStyle}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            {...scrollViewProps}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, defaultContentStyle]}>{children}</View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

/**
 * Reusable header component for dashboard pages
 */
interface DashboardHeaderProps {
  title: string;
  rightComponent?: React.ReactNode;
  showBorder?: boolean;
  backgroundColor?: string;
  style?: ViewStyle;
}

export function DashboardHeader({
  title,
  rightComponent,
  showBorder = false,
  backgroundColor,
  style,
}: DashboardHeaderProps) {
  const { isDarkMode } = useTheme();

  const headerStyle: ViewStyle = {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: backgroundColor || (isDarkMode ? "#111827" : "#ffffff"),
    ...(showBorder && {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
    }),
    ...style,
  };

  return (
    <View style={headerStyle}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: isDarkMode ? "#ffffff" : "#1f2937",
        }}
      >
        {title}
      </Text>
      {rightComponent}
    </View>
  );
}
