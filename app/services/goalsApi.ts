import {
  Goal,
  GoalCreate,
  GoalUpdate,
  GoalProgressUpdate,
  GoalNote,
  WeeklyReflection,
  GoalStats,
  ActionPlan,
} from "../types/goals";
import {
  PillarTimePreferences,
  PillarType,
  TimePreference,
} from "../types/preferences";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

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

  // Daily Completion (for streak calendar)
  async getDailyCompletion(
    userEmail: string,
    month: number,
    year: number
  ): Promise<Record<string, number>> {
    const params = new URLSearchParams({
      user_email: userEmail,
      month: month.toString(),
      year: year.toString(),
    });
    const response = await this.makeRequest<
      ApiResponse<{ daily_completion: Record<string, number> }>
    >(`/api/goals/daily-completion?${params}`);
    return response.data?.daily_completion || {};
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

  async generatePlan(
    goalId: string,
    userEmail: string,
    pillarPreferences?: PillarTimePreferences[]
  ): Promise<{ actionPlan: ActionPlan; weeklySchedule: any }> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response: ApiResponse<{
      action_plan: ActionPlan;
      weekly_schedule: any;
    }> = await this.makeRequest(
      `/api/goals/${goalId}/generate-plan?${params}`,
      {
        method: "POST",
        body: JSON.stringify(pillarPreferences),
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || "Failed to generate plan");
    }

    return {
      actionPlan: response.data.action_plan,
      weeklySchedule: response.data.weekly_schedule,
    };
  }

  // File Upload Operations
  async uploadDocument(
    file: File | { uri: string; name: string; type: string },
    userEmail: string
  ): Promise<{ upload_id: string }> {
    const formData = new FormData();

    if (file instanceof File) {
      formData.append("file", file, file.name);
    } else {
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.type || "application/octet-stream",
      } as any);
    }

    const response = await fetch(
      `${API_BASE_URL}/upload/document?email=${encodeURIComponent(userEmail)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async monitorUploadProgress(uploadId: string): Promise<{
    percentage: number;
    message: string;
    status: "processing" | "completed" | "failed";
    entities_count?: number;
    relationships_count?: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/upload/progress/${uploadId}`);

    if (!response.ok) {
      throw new Error(`Failed to get progress: ${response.status}`);
    }

    const data = await response.json();
    return data.progress;
  }

  async getUploadedFiles(userEmail: string): Promise<
    Array<{
      id: string;
      upload_id: string;
      filename: string;
      size: number;
      extension: string;
      status: string;
      entities_count: number;
      relationships_count: number;
    }>
  > {
    const response = await fetch(
      `${API_BASE_URL}/upload/files?email=${encodeURIComponent(userEmail)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch uploaded files: ${response.status}`);
    }
    const data = await response.json();
    return data.files || [];
  }

  async deleteUploadedFile(uploadId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/upload/files/${uploadId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to delete file: ${response.status} ${text}`);
    }
  }

  async testBackendConnection(): Promise<boolean> {
    try {
      const response = await fetch(API_BASE_URL);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Preferences
  async getTimePreferences(
    userEmail: string
  ): Promise<PillarTimePreferences | null> {
    const params = new URLSearchParams({ user_email: userEmail });
    const res = await this.makeRequest<any>(`/api/preferences/time?${params}`);
    const pref = res?.data?.preferences;
    return pref || null;
  }

  async setTimePreferences(prefs: PillarTimePreferences): Promise<void> {
    await this.makeRequest(`/api/preferences/time`, {
      method: "POST",
      body: JSON.stringify(prefs),
    });
  }

  // Action Item Completion Methods
  async markActionItemCompletion(
    goalId: string,
    userEmail: string,
    completionData: {
      action_item_title: string;
      completion_date: string; // YYYY-MM-DD format
      completed: boolean;
      notes?: string;
    }
  ): Promise<any> {
    const params = new URLSearchParams({ user_email: userEmail });
    const response = await this.makeRequest<ApiResponse<any>>(
      `/api/goals/${goalId}/action-items/complete?${params}`,
      {
        method: "POST",
        body: JSON.stringify(completionData),
      }
    );
    return response.data;
  }

  async getGoalCompletionStats(
    goalId: string,
    userEmail: string,
    weekStart: string // YYYY-MM-DD format
  ): Promise<any> {
    const params = new URLSearchParams({
      user_email: userEmail,
      week_start: weekStart,
    });
    const response = await this.makeRequest<ApiResponse<any>>(
      `/api/goals/${goalId}/completion-stats?${params}`
    );
    return response.data?.completion_stats;
  }

  async getAllGoalsCompletionStats(
    userEmail: string,
    weekStart: string // YYYY-MM-DD format
  ): Promise<Record<string, any>> {
    const params = new URLSearchParams({
      user_email: userEmail,
      week_start: weekStart,
    });
    const response = await this.makeRequest<ApiResponse<any>>(
      `/api/goals/completion-stats?${params}`
    );
    return response.data?.completion_stats || {};
  }
}

export const goalsApi = new GoalsApiService();
