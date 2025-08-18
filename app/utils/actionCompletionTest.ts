// Test file to verify circular progress ring implementation
// This file can be used to test the action completion tracking system

import { goalsApi } from "../services/goalsApi";

// Test function to verify action completion marking
export const testActionCompletionTracking = async () => {
  const testUserEmail = "test@example.com";
  const testGoalId = "test-goal-123";
  const testActionItemTitle = "Morning Exercise";
  const testDate = new Date().toISOString().split("T")[0]; // Today in YYYY-MM-DD format

  try {
    console.log("🧪 Testing Action Completion Tracking...");

    // 1. Mark an action item as completed
    console.log("📝 Marking action item as completed...");
    const completionResult = await goalsApi.markActionItemCompletion(
      testGoalId,
      testUserEmail,
      {
        action_item_title: testActionItemTitle,
        completion_date: testDate,
        completed: true,
        notes: "Completed 30 minutes of cardio",
      }
    );
    console.log("✅ Action item marked as completed:", completionResult);

    // 2. Get completion stats for a specific goal
    console.log("📊 Getting goal completion stats...");
    const getCurrentWeekStart = () => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() + mondayOffset);
      return monday.toISOString().split("T")[0]; // YYYY-MM-DD format
    };

    const weekStart = getCurrentWeekStart();
    const goalStats = await goalsApi.getGoalCompletionStats(
      testGoalId,
      testUserEmail,
      weekStart
    );
    console.log("📈 Goal completion stats:", goalStats);

    // 3. Get all goals completion stats
    console.log("📊 Getting all goals completion stats...");
    const allGoalsStats = await goalsApi.getAllGoalsCompletionStats(
      testUserEmail,
      weekStart
    );
    console.log("📈 All goals completion stats:", allGoalsStats);

    return {
      success: true,
      message: "All tests passed successfully!",
      data: {
        completion: completionResult,
        goalStats,
        allGoalsStats,
      },
    };
  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      success: false,
      message: "Test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Mock data for testing circular progress rings
export const mockGoalCompletionData = {
  "goal-1": {
    overall_completion_percentage: 85,
    daily_stats: [
      { date: "2025-08-17", completion_percentage: 100 },
      { date: "2025-08-18", completion_percentage: 80 },
      { date: "2025-08-19", completion_percentage: 90 },
    ],
  },
  "goal-2": {
    overall_completion_percentage: 65,
    daily_stats: [
      { date: "2025-08-17", completion_percentage: 50 },
      { date: "2025-08-18", completion_percentage: 70 },
      { date: "2025-08-19", completion_percentage: 75 },
    ],
  },
  "goal-3": {
    overall_completion_percentage: 35,
    daily_stats: [
      { date: "2025-08-17", completion_percentage: 25 },
      { date: "2025-08-18", completion_percentage: 40 },
      { date: "2025-08-19", completion_percentage: 40 },
    ],
  },
};

// Test the color logic for circular progress rings
export const testProgressRingColors = () => {
  const testPercentages = [10, 35, 55, 75, 90];

  testPercentages.forEach((percentage) => {
    const color =
      percentage >= 80
        ? "#10b981" // Green for high completion
        : percentage >= 50
        ? "#f59e0b" // Yellow for medium completion
        : "#ef4444"; // Red for low completion

    console.log(`📊 ${percentage}% completion -> Color: ${color}`);
  });
};

// Usage example:
// import { testActionCompletionTracking, testProgressRingColors } from './actionCompletionTest';
//
// testActionCompletionTracking().then(result => {
//   console.log('Test result:', result);
// });
//
// testProgressRingColors();
