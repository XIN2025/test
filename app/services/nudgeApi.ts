import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

class NudgeApiService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Register or update a user's FCM token for push notifications.
   * @param email User's email address
   * @param fcmToken FCM token string
   */
  async registerFcmToken(email: string, fcmToken: string): Promise<{ success: boolean; message: string }> {
    const response: ApiResponse<null> = await this.makeRequest('/api/nudge/register-fcm-token', {
      method: 'POST',
      body: JSON.stringify({
        email,
        fcm_token: fcmToken,
      }),
    });
    return {
      success: response.success,
      message: response.message,
    };
  }

  // Add more nudge-related API methods here as needed in the future.
}

export const nudgeApi = new NudgeApiService();
