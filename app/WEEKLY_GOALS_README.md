# Weekly Goal Setting Feature

## Overview

The Weekly Goal Setting feature provides users with an intuitive interface to define, track, and reflect on weekly goals
with auto-assist features and integration into planner and habit modules.

## Features Implemented

### ✅ 1. Weekly Goal Planning Interface

- **Location**: `app/app/dashboard/goals.tsx`
- **Features**:
  - Intuitive goal creation with title, description, priority, and category
  - Visual progress tracking with progress bars
  - Priority levels (High, Medium, Low) with color coding
  - Goal categories (Health, Fitness, Nutrition, Mental, Personal)
  - Target values with units for measurable goals

### ✅ 2. User Goal Setting and Priorities

- **Features**:
  - Add new goals with detailed information
  - Set priority levels for goal management
  - Categorize goals for better organization
  - Set target values and units for measurable goals
  - Due date selection for goal deadlines

### ✅ 3. Mid-week Adjustments and Notes

- **Features**:
  - Quick progress updates with +/- buttons
  - Custom value input for precise tracking
  - Add notes to goals for context and reflection
  - Edit existing goals
  - Toggle goal completion status

### ✅ 4. Integration with Habit Tracker and Planner

- **Components**:
  - `HabitGoalIntegration.tsx` - Shows how goals break down into daily habits
  - `WeeklyGoalsSummary.tsx` - Displays goal summary on main dashboard
  - Integration with existing dashboard tabs

### ✅ 5. Weekly Progress Summary at Weekends

- **Component**: `WeeklyReflection.tsx`
- **Features**:
  - Weekly rating system (1-5 stars)
  - Reflection text input for user thoughts
  - Next week goal planning
  - Progress statistics and completion rates

## Components Created

### 1. Goals Screen (`app/app/dashboard/goals.tsx`)

Main interface for managing weekly goals with:

- Goal creation and editing
- Progress tracking
- Notes and adjustments
- Week navigation
- Reflection prompts

### 2. Weekly Goals Summary (`app/components/WeeklyGoalsSummary.tsx`)

Reusable component showing goal overview with:

- Completion status
- Progress indicators
- Quick access to full goals view

### 3. Goal Progress Tracker (`app/components/GoalProgressTracker.tsx`)

Individual goal tracking component with:

- Progress bars
- Quick update buttons
- Custom value input
- Completion status

### 4. Weekly Reflection (`app/components/WeeklyReflection.tsx`)

Weekend reflection interface with:

- Star rating system
- Reflection text input
- Next week goal planning
- Progress statistics

### 5. Habit Goal Integration (`app/components/HabitGoalIntegration.tsx`)

Shows how goals connect to daily habits:

- Suggested daily habits for each goal
- Habit completion tracking
- Tips for consistency

## Navigation Integration

### Tab Bar Integration

- Added "Goals" tab to the main dashboard navigation
- Uses Target icon from lucide-react-native
- Positioned between Chat and Orders tabs

### Dashboard Integration

- Added weekly goals summary to main dashboard
- Shows top 3 goals with progress
- Quick access to full goals view

## Data Structure

### Goal Interface

```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'health' | 'fitness' | 'nutrition' | 'mental' | 'personal';
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  completed: boolean;
  notes: string[];
  createdAt: Date;
  dueDate: Date;
}
```

### Weekly Progress Interface

```typescript
interface WeeklyProgress {
  weekStart: Date;
  weekEnd: Date;
  goals: Goal[];
  reflection: string;
  rating: number;
}
```

## Usage

### Adding a New Goal

1. Navigate to the Goals tab
2. Tap the "+" button in the header
3. Fill in goal details (title, description, priority, category)
4. Set target value and unit if applicable
5. Tap "Add Goal"

### Tracking Progress

1. View goals in the Goals tab
2. Use quick update buttons (+/-) for incremental changes
3. Enter custom values for precise tracking
4. Add notes for context and reflection

### Weekly Reflection

1. On weekends, the reflection prompt appears automatically
2. Rate your week (1-5 stars)
3. Write reflection on achievements and challenges
4. Plan goals for the next week
5. Save your reflection

## Future Enhancements

### Potential Additions

- Goal templates for common health goals
- AI-powered goal suggestions
- Integration with calendar/planner
- Goal sharing and social features
- Advanced analytics and insights
- Goal streaks and achievements
- Reminder notifications
- Export/import goal data

### Technical Improvements

- Persistent data storage
- Offline functionality
- Data synchronization
- Performance optimizations
- Accessibility improvements

## File Structure

```
app/
├── app/dashboard/
│   ├── _layout.tsx (updated with Goals tab)
│   ├── goals.tsx (main goals screen)
│   └── main.tsx (updated with goals summary)
└── components/
    ├── WeeklyGoalsSummary.tsx
    ├── GoalProgressTracker.tsx
    ├── WeeklyReflection.tsx
    └── HabitGoalIntegration.tsx
```

## Dependencies

- React Native
- Expo Router
- Lucide React Native (for icons)
- NativeWind (for styling)
- React Native Safe Area Context

The weekly goal setting feature is now fully implemented and integrated into the app's navigation system, providing
users with a comprehensive tool for setting, tracking, and reflecting on their weekly health and wellness goals.
