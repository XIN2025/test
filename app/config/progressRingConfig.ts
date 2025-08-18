// Configuration for circular progress ring colors and themes
export const progressRingConfig = {
  // Color thresholds for completion percentages
  colors: {
    high: "#10b981", // Green - 80%+ completion
    medium: "#f59e0b", // Yellow - 50-79% completion
    low: "#ef4444", // Red - 0-49% completion
  },

  // Theme-specific background colors
  backgrounds: {
    light: "#e5e7eb", // Light gray for light theme
    dark: "#374151", // Dark gray for dark theme
  },

  // Text colors for percentage display
  textColors: {
    light: "#374151", // Dark text for light theme
    dark: "#d1d5db", // Light text for dark theme
  },

  // Default sizes for different use cases
  sizes: {
    small: 30, // For compact displays
    medium: 40, // For dashboard cards
    large: 50, // For detailed goal views
    xlarge: 60, // For main displays
  },

  // Default stroke widths
  strokeWidths: {
    thin: 2,
    normal: 3,
    thick: 4,
    bold: 5,
  },

  // Animation settings (for future enhancement)
  animation: {
    duration: 300, // milliseconds
    easing: "easeInOut",
  },
};

// Helper function to get color based on completion percentage
export const getProgressColor = (percentage: number): string => {
  if (percentage >= 80) return progressRingConfig.colors.high;
  if (percentage >= 50) return progressRingConfig.colors.medium;
  return progressRingConfig.colors.low;
};

// Helper function to get background color based on theme
export const getProgressBackground = (isDarkMode: boolean): string => {
  return isDarkMode
    ? progressRingConfig.backgrounds.dark
    : progressRingConfig.backgrounds.light;
};

// Helper function to get text color based on theme
export const getProgressTextColor = (isDarkMode: boolean): string => {
  return isDarkMode
    ? progressRingConfig.textColors.dark
    : progressRingConfig.textColors.light;
};

// Default props for consistent styling
export const getDefaultProgressRingProps = (isDarkMode: boolean) => ({
  backgroundColor: getProgressBackground(isDarkMode),
  textColor: getProgressTextColor(isDarkMode),
  size: progressRingConfig.sizes.medium,
  strokeWidth: progressRingConfig.strokeWidths.normal,
  showPercentage: true,
});

// Usage example:
// import { getProgressColor, getDefaultProgressRingProps } from '@/config/progressRingConfig';
//
// const MyComponent = ({ percentage, isDarkMode }) => (
//   <CircularProgressRing
//     progress={percentage}
//     color={getProgressColor(percentage)}
//     {...getDefaultProgressRingProps(isDarkMode)}
//   />
// );
