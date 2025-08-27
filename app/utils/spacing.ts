/**
 * Consistent spacing utilities for the app
 */
export const spacing = {
  // Base spacing units
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  // Specific use cases
  tabBarHeight: 80, // Approximate tab bar height
  headerHeight: 60,
  cardGap: 16,
  contentPadding: 16,

  // Safe area padding for bottom content
  bottomSafe: 100, // Tab bar + extra padding

  // Screen margins
  screenHorizontal: 16,
  screenVertical: 16,
} as const;

/**
 * Get safe bottom padding for ScrollView content
 */
export const getSafeBottomPadding = (extraPadding: number = 20): number => {
  return spacing.tabBarHeight + extraPadding;
};

/**
 * Common layout styles
 */
export const layoutStyles = {
  screenContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.screenVertical,
    paddingBottom: getSafeBottomPadding(),
  },
  cardContainer: {
    gap: spacing.cardGap,
  },
  headerContainer: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
  },
} as const;
