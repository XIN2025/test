export type GoalPriority = "high" | "medium" | "low";
export type GoalCategory = "health" | "fitness" | "nutrition" | "mental" | "personal";

export interface TimeEstimate {
  min_duration: string;
  max_duration: string;
  recommended_frequency: string;
}

export interface ActionItem {
  title: string;
  description: string;
  priority: string;
  time_estimate: TimeEstimate;
  prerequisites: string[];
  success_criteria: string[];
  adaptation_notes: string[];
}

export interface ActionPlan {
  goal_id: string;
  goal_title: string;
  action_items: ActionItem[];
  total_estimated_time_per_week: string;
  health_adaptations: string[];
  suggested_schedule?: any;
}

export interface WeeklySchedule {
  start_date: string;
  end_date: string;
  daily_schedules: {
    [key: string]: {
      date: string;
      time_slots: Array<{
        start_time: string;
        end_time: string;
        duration: string;
        pillar?: string;
        action_item?: string;
        frequency?: string;
        priority?: string;
        health_notes?: string[];
      }>;
      total_duration: string;
      pillars_covered: string[];
    };
  };
  total_weekly_hours: number;
  pillar_distribution: { [key: string]: number };
  health_adaptations: string[];
  schedule_notes?: string[];
}

export interface GoalBase {
  title: string;
  description?: string;
  priority: GoalPriority;
  category: GoalCategory;
  target_value?: number;
  unit?: string;
  due_date?: string;
}

export interface GoalCreate extends GoalBase {
  user_email: string;
}

export interface GoalUpdate {
  title?: string;
  description?: string;
  priority?: GoalPriority;
  category?: GoalCategory;
  target_value?: number;
  unit?: string;
  current_value?: number;
  completed?: boolean;
  due_date?: string;
}

export interface Goal extends GoalBase {
  id: string;
  user_email: string;
  current_value?: number;
  completed: boolean;
  notes: string[];
  created_at: string;
  updated_at: string;
}

export interface GoalProgressUpdate {
  goal_id: string;
  current_value: number;
  note?: string;
}

export interface TimeEstimate {
  min_duration: string; // ISO duration
  max_duration: string; // ISO duration
  recommended_frequency: string;
}

export interface ActionItem {
  title: string;
  description: string;
  priority: string;
  time_estimate: TimeEstimate;
  prerequisites: string[];
  success_criteria: string[];
  adaptation_notes: string[];
}

export interface ActionPlan {
  goal_id: string;
  goal_title: string;
  action_items: ActionItem[];
  total_estimated_time_per_week: string; // ISO duration
  health_adaptations: string[];
  suggested_schedule?: any;
}

export interface GoalNote {
  goal_id: string;
  note: string;
}

export interface WeeklyReflection {
  user_email: string;
  week_start: string;
  week_end: string;
  rating: number;
  reflection?: string;
  next_week_goals: string[];
}

export interface WeeklyProgress {
  user_email: string;
  week_start: string;
  week_end: string;
  goals: Goal[];
  reflection?: string;
  rating?: number;
  created_at: string;
}

export interface HabitGoal {
  goal_id: string;
  habit_title: string;
  completed: boolean;
  completed_at?: string;
}

export interface GoalStats {
  total_goals: number;
  completed_goals: number;
  completion_rate: number;
  average_rating?: number;
  weekly_streak: number;
}

export interface GoalResponse {
  success: boolean;
  message: string;
  data?: any;
}

// Frontend specific types
export interface GoalFormData {
  title: string;
  description: string;
  priority: GoalPriority;
  category: GoalCategory;
  targetValue: string;
  unit: string;
  dueDate: Date;
}

export interface WeeklyProgressData {
  weekStart: Date;
  weekEnd: Date;
  goals: Goal[];
  reflection?: string;
  rating?: number;
  stats: {
    total_goals: number;
    completed_goals: number;
    completion_rate: number;
  };
}
