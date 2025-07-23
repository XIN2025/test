import { create } from "zustand";
import { AuthState, User } from "../types/auth.types";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
  STORAGE_KEYS,
} from "../utils/storage";

// Demo users for local testing
const DEMO_USERS: User[] = [
  {
    id: "1",
    email: "demo@opengig.work",
    name: "OpenGig User",
  },
];

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Demo authentication logic
      const user = DEMO_USERS.find((u) => u.email === email);
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Store user data
      await setStorageItem(STORAGE_KEYS.USER, user);

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },

  signup: async (email: string, password: string, name: string) => {
    try {
      set({ isLoading: true, error: null });

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if user exists
      const existingUser = DEMO_USERS.find((u) => u.email === email);
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Create new user
      const newUser: User = {
        id: String(DEMO_USERS.length + 1),
        email,
        name,
      };

      DEMO_USERS.push(newUser);
      await setStorageItem(STORAGE_KEYS.USER, newUser);

      set({ user: newUser, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await removeStorageItem(STORAGE_KEYS.USER);
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  },
}));

// Initialize auth state from storage
export const initializeAuth = async () => {
  const user = await getStorageItem<User>(STORAGE_KEYS.USER);
  useAuthStore.setState({
    user,
    isAuthenticated: !!user,
    isLoading: false,
  });
};
