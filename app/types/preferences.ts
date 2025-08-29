export enum PillarType {
  HEALTH = 'HEALTH',
  FITNESS = 'FITNESS',
  NUTRITION = 'NUTRITION',
  MENTAL = 'MENTAL',
  PERSONAL = 'PERSONAL',
}

export interface TimePreference {
  preferred_time: string; // HH:mm format
  duration_minutes: number;
  days_of_week: number[]; // 0-6 (Sunday-Saturday)
  reminder_before_minutes: number;
}

export interface PillarTimePreferences {
  user_email: string;
  agent_mode?: boolean;
  preferences: {
    [key in PillarType]?: TimePreference;
  };
}
