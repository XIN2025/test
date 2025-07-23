import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  USER: "@user",
  AUTH_TOKEN: "@auth_token",
} as const;

export const setStorageItem = async (
  key: string,
  value: any
): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (error) {
    console.error("Error saving to storage:", error);
  }
};

export const getStorageItem = async <T>(key: string): Promise<T | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error("Error reading from storage:", error);
    return null;
  }
};

export const removeStorageItem = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error("Error removing from storage:", error);
  }
};
