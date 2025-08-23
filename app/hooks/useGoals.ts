import { useCallback, useEffect, useState } from "react";
import { goalsApi } from "../services/goalsApi";
import { Goal, GoalCreate, GoalStats, GoalUpdate, WeeklyReflection } from "../types/goals";

interface UseGoalsOptions {
  userEmail: string;
  autoLoad?: boolean;
}

export const useGoals = ({ userEmail, autoLoad = true }: UseGoalsOptions) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GoalStats | null>(null);

  const loadGoals = useCallback(
    async (weekStart?: string) => {
      if (!userEmail) return;

      setLoading(true);
      setError(null);

      try {
        const goalsData = await goalsApi.getUserGoals(userEmail, weekStart);
        console.log("goalsData", goalsData);
        setGoals(goalsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load goals");
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const loadStats = useCallback(
    async (weeks: number = 4) => {
      if (!userEmail) return;

      try {
        const statsData = await goalsApi.getGoalStats(userEmail, weeks);
        if (statsData && "goal_progress" in statsData) {
          setStats(statsData);
        }
      } catch (err) {
        console.error("Failed to load stats:", err);
        // Don't set stats if there's an error
        setStats(null);
      }
    },
    [userEmail]
  );

  const createGoal = useCallback(
    async (goalData: Omit<GoalCreate, "user_email">) => {
      if (!userEmail) throw new Error("User email is required");

      setLoading(true);
      setError(null);

      try {
        const newGoal = await goalsApi.createGoal({
          ...goalData,
          user_email: userEmail,
        });
        setGoals((prev) => [newGoal, ...prev]);
        return newGoal;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to create goal";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const updateGoal = useCallback(
    async (goalId: string, updateData: GoalUpdate) => {
      setLoading(true);
      setError(null);

      try {
        const updatedGoal = await goalsApi.updateGoal(goalId, updateData, userEmail);
        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)));
        return updatedGoal;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update goal";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      setLoading(true);
      setError(null);

      try {
        await goalsApi.deleteGoal(goalId, userEmail);
        setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to delete goal";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const updateGoalProgress = useCallback(
    async (goalId: string, currentValue: number, note?: string) => {
      setLoading(true);
      setError(null);

      try {
        const updatedGoal = await goalsApi.updateGoalProgress(
          goalId,
          { goal_id: goalId, current_value: currentValue, note },
          userEmail
        );
        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)));
        return updatedGoal;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to update goal progress";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const addGoalNote = useCallback(
    async (goalId: string, note: string) => {
      setLoading(true);
      setError(null);

      try {
        const updatedGoal = await goalsApi.addGoalNote(goalId, { goal_id: goalId, note }, userEmail);
        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? updatedGoal : goal)));
        return updatedGoal;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to add note";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const saveWeeklyReflection = useCallback(
    async (reflectionData: Omit<WeeklyReflection, "user_email">) => {
      if (!userEmail) throw new Error("User email is required");

      setLoading(true);
      setError(null);

      try {
        const result = await goalsApi.saveWeeklyReflection({
          ...reflectionData,
          user_email: userEmail,
        });
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save reflection";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [userEmail]
  );

  const getWeeklyReflection = useCallback(
    async (weekStart: string) => {
      if (!userEmail) return null;

      try {
        return await goalsApi.getWeeklyReflection(userEmail, weekStart);
      } catch (err) {
        console.error("Failed to get weekly reflection:", err);
        return null;
      }
    },
    [userEmail]
  );

  const getWeeklyProgress = useCallback(
    async (weekStart: string) => {
      if (!userEmail) return null;

      try {
        return await goalsApi.getWeeklyProgress(userEmail, weekStart);
      } catch (err) {
        console.error("Failed to get weekly progress:", err);
        return null;
      }
    },
    [userEmail]
  );

  const getCurrentWeekGoals = useCallback(async () => {
    if (!userEmail) return null;

    try {
      return await goalsApi.getCurrentWeekGoals(userEmail);
    } catch (err) {
      console.error("Failed to get current week goals:", err);
      return null;
    }
  }, [userEmail]);

  // Auto-load goals on mount
  useEffect(() => {
    if (autoLoad && userEmail) {
      loadGoals();
      loadStats();
    }
  }, [userEmail, autoLoad, loadGoals, loadStats]);

  return {
    goals,
    loading,
    error,
    stats,
    loadGoals,
    loadStats,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    addGoalNote,
    saveWeeklyReflection,
    getWeeklyReflection,
    getWeeklyProgress,
    getCurrentWeekGoals,
  };
};
