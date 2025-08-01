import {
  Goal,
  GoalCreate,
  GoalUpdate,
  GoalProgressUpdate,
  GoalNote,
  WeeklyReflection,
  GoalStats,
} from "../types/goals";
import Constants from "expo-constants";

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

class GoalsApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `HTTP error! status: ${response.status}`
      );
    }

    return response.json();
  }

  // Goal CRUD operations
  async createGoal(goalData: GoalCreate): Promise<Goal> {
    const response: ApiResponse<{ goal: Goal }> = await this.makeRequest(
      "/api/goals",
      {
        method: "POST",
        body: JSON.stringify(goalData),
      }
    );
    return response.data!.goal;
  }

  async getUserGoals(userEmail: string, weekStart?: string): Promise<Goal[]> {
    const params = new URLSearchParams({ user_email: userEmail });
    if (weekStart) {
      params.append("week_start", weekStart);
    }

    const response: ApiResponse<{ goals: Goal[] }> = await this.makeRequest(
      `/api/goals?${params}`
    );
    return response.data!.goals;
  }

  async getGoalById(goalId: string, userEmail: string): Promise<Goal> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{ goal: Goal }> = await this.makeRequest(
      `/api/goals/${goalId}?${params}`
    );
    return response.data!.goal;
  }

  async updateGoal(
    goalId: string,
    goalData: GoalUpdate,
    userEmail: string
  ): Promise<Goal> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{ goal: Goal }> = await this.makeRequest(
      `/api/goals/${goalId}?${params}`,
      {
        method: "PUT",
        body: JSON.stringify(goalData),
      }
    );
    return response.data!.goal;
  }

  async deleteGoal(goalId: string, userEmail: string): Promise<void> {
    const params = new URLSearchParams({ user_email: userEmail });
    await this.makeRequest(`/api/goals/${goalId}?${params}`, {
      method: "DELETE",
    });
  }

  // Progress tracking
  async updateGoalProgress(
    goalId: string,
    progressData: GoalProgressUpdate,
    userEmail: string
  ): Promise<Goal> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{ goal: Goal }> = await this.makeRequest(
      `/api/goals/${goalId}/progress?${params}`,
      {
        method: "POST",
        body: JSON.stringify(progressData),
      }
    );
    return response.data!.goal;
  }

  async addGoalNote(
    goalId: string,
    noteData: GoalNote,
    userEmail: string
  ): Promise<Goal> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{ goal: Goal }> = await this.makeRequest(
      `/api/goals/${goalId}/notes?${params}`,
      {
        method: "POST",
        body: JSON.stringify(noteData),
      }
    );
    return response.data!.goal;
  }

  // Weekly reflection
  async saveWeeklyReflection(reflectionData: WeeklyReflection): Promise<any> {
    const response: ApiResponse<any> = await this.makeRequest(
      "/api/goals/reflection",
      {
        method: "POST",
        body: JSON.stringify(reflectionData),
      }
    );
    return response.data;
  }

  async getWeeklyReflection(
    userEmail: string,
    weekStart: string
  ): Promise<any> {
    const params = new URLSearchParams({
      user_email: userEmail,
      week_start: weekStart,
    });
    const response: ApiResponse<{ reflection: any }> = await this.makeRequest(
      `/api/goals/reflection?${params}`
    );
    return response.data!.reflection;
  }

  // Statistics and progress
  async getGoalStats(userEmail: string, weeks: number = 4): Promise<GoalStats> {
    const params = new URLSearchParams({
      user_email: userEmail,
      weeks: weeks.toString(),
    });
    const response: ApiResponse<{ stats: GoalStats }> = await this.makeRequest(
      `/api/goals/stats?${params}`
    );
    return response.data!.stats;
  }

  async getWeeklyProgress(userEmail: string, weekStart: string): Promise<any> {
    const params = new URLSearchParams({
      user_email: userEmail,
      week_start: weekStart,
    });
    const response: ApiResponse<any> = await this.makeRequest(
      `/api/goals/weekly-progress?${params}`
    );
    return response.data;
  }

  async getCurrentWeekGoals(
    userEmail: string
  ): Promise<{ week_start: string; goals: Goal[] }> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{ week_start: string; goals: Goal[] }> =
      await this.makeRequest(`/api/goals/current-week?${params}`);
    return response.data!;
  }
}

export const goalsApi = new GoalsApiService();
