// Shared API utilities with proper error handling
export interface ApiResponse<T = any> {
  data?: T;
  detail?: string;
  success?: boolean;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export class ApiException extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.name = "ApiException";
    this.status = status;
    this.code = code;
  }
}

// Base API configuration
const API_BASE_URL = "http://localhost:8000";

// Generic API request function
export const apiRequest = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiException(
        data.detail || data.error || "An unexpected error occurred",
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiException("Network error. Please check your connection.", 0);
    }

    throw new ApiException(
      error instanceof Error ? error.message : "An unexpected error occurred"
    );
  }
};

// Specific API functions
export const authApi = {
  login: async (email: string) => {
    return apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  register: async (name: string, email: string) => {
    return apiRequest("/register", {
      method: "POST",
      body: JSON.stringify({ name, email }),
    });
  },

  verifyLoginOTP: async (email: string, otp: string) => {
    return apiRequest("/verify-login-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },

  verifyRegistrationOTP: async (email: string, otp: string) => {
    return apiRequest("/verify-registration-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
  },
};

export const userApi = {
  savePreferences: async (preferences: any) => {
    return apiRequest("/api/user/preferences", {
      method: "POST",
      body: JSON.stringify(preferences),
    });
  },

  getPreferences: async (email: string) => {
    return apiRequest(`/api/user/preferences?email=${email}`);
  },
};

// Error handling utility
export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiException) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
};
