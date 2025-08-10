import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import EvraLogo from "../components/EvraLogo";
import Constants from "expo-constants";

// TypeScript interfaces
interface LoginFormData {
  email: string;
}

interface ValidationErrors {
  email?: string;
}

interface ApiResponse {
  detail?: string;
  success?: boolean;
}

export default function LoginScreen() {
  const [formData, setFormData] = useState<LoginFormData>({ email: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return "Email is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) {
      setApiError(null);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      setApiError(null);
      const API_BASE_URL =
        Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      // Parse JSON if available, but don't crash if not
      let data: ApiResponse | null = null;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (_) {
        data = null;
      }

      if (!response.ok) {
        const backendMsg = data?.detail || (data as any)?.message;
        const message = backendMsg || "Login failed. Please try again.";

        // Map known errors to field/general errors
        if (response.status === 404 && backendMsg) {
          if (/not\s+found/i.test(backendMsg) || /email/i.test(backendMsg)) {
            setErrors((prev) => ({ ...prev, email: backendMsg }));
          }
        }
        if (response.status === 403 && backendMsg) {
          // User not verified -> show as banner
          setApiError(backendMsg);
        }
        if (response.status !== 404 && response.status !== 403) {
          setApiError(message);
        }
        return;
      }

      Alert.alert("Success", "OTP sent to your email.");
      router.push({
        pathname: "./verify-login-otp",
        params: { email: formData.email.trim() },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.email.trim().length > 0 && Object.keys(errors).length === 0;

  return (
    <View className="flex-1 justify-center items-center bg-green-50 px-4">
      {/* Logo */}
      <View className="items-center mb-8">
        <EvraLogo size={64} />
        <Text
          className="text-3xl"
          style={{ color: "#114131", fontFamily: "SourceSansPro" }}
        >
          Evra
        </Text>
        <Text className="mt-1" style={{ color: "#114131", fontFamily: "Evra" }}>
          Your Agent for Better Health
        </Text>
      </View>
      {/* Card */}
      <View className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 items-center">
        <Text className="text-2xl font-bold mb-2 text-center">
          Welcome Back
        </Text>
        <Text className="text-gray-500 mb-6 text-center">
          Sign in to continue your health journey
        </Text>
        {apiError ? (
          <View className="w-full rounded-md border border-red-400 bg-red-100 p-3 mb-4">
            <Text className="text-red-800 text-sm">{apiError}</Text>
          </View>
        ) : null}
        {/* Email Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">Email</Text>
          <TextInput
            className={`border rounded-md px-4 py-3 w-full text-base bg-gray-50 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(value) => handleInputChange("email", value)}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            autoComplete="email"
            textContentType="emailAddress"
          />
          {errors.email && (
            <Text className="text-red-500 text-sm mt-1">{errors.email}</Text>
          )}
        </View>
        {/* Sign In Button */}
        <TouchableOpacity
          className={`rounded-md w-full py-3 mt-2 mb-2 items-center ${
            !isFormValid || loading ? "opacity-50" : ""
          }`}
          style={{ backgroundColor: "#059669" }}
          onPress={handleLogin}
          disabled={!isFormValid || loading}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "Sending OTP..." : "Sign In"}
          </Text>
        </TouchableOpacity>
        {/* Sign Up Link */}
        <Text className="mt-2 text-gray-700 text-center">
          Don't have an account?{" "}
          <Text
            className="font-semibold"
            style={{ color: "#059669" }}
            onPress={() => router.push("./register")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
      {/* Terms */}
      <Text className="text-xs text-gray-400 mt-8 text-center">
        By signing in, you agree to our{" "}
        <Text className="underline">Terms of Service</Text> and{" "}
        <Text className="underline">Privacy Policy</Text>
      </Text>
    </View>
  );
}
