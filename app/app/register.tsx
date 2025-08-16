import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import EvraLogo from "../components/EvraLogo";
import Constants from "expo-constants";
import { useAuth } from "@/context/AuthContext";

// TypeScript interfaces
interface RegisterFormData {
  name: string;
  email: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
}

interface ApiResponse {
  detail?: string;
  success?: boolean;
}

export default function RegisterScreen() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard/main");
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render if loading or already authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return "Name is required";
    }
    if (name.trim().length < 2) {
      return "Name must be at least 2 characters long";
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return "Name can only contain letters and spaces";
    }
    return undefined;
  };

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

    const nameError = validateName(formData.name);
    if (nameError) {
      newErrors.name = nameError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Remove the field from the errors object entirely to allow re-enable
    if (errors[field] !== undefined) {
      setErrors((prev) => {
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }
    if (apiError) setApiError(null);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      setApiError(null);
      const API_BASE_URL =
        Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      // Try to parse any JSON error payload
      let data: ApiResponse | null = null;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (_) {
        data = null;
      }

      if (!response.ok) {
        const backendMsg = data?.detail || (data as any)?.message;
        const message = backendMsg || "Registration failed. Please try again.";

        // Map known 400 detail to the email field error if applicable
        if (response.status === 400 && backendMsg) {
          if (/email/i.test(backendMsg)) {
            setErrors((prev) => ({ ...prev, email: backendMsg }));
          }
        }
        setApiError(message);
        return;
      }

      Alert.alert("Success", "OTP sent to your email.");
      router.push({
        pathname: "./verify-registration-otp",
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
    formData.name.trim().length > 0 &&
    formData.email.trim().length > 0 &&
    Object.keys(errors).length === 0;

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
          Create Account
        </Text>
        <Text className="text-gray-500 mb-6 text-center">
          Sign up to start your health journey
        </Text>
        {apiError ? (
          <View className="w-full rounded-md border border-red-400 bg-red-100 p-3 mb-4">
            <Text className="text-red-800 text-sm">{apiError}</Text>
          </View>
        ) : null}
        {/* Name Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">Name</Text>
          <TextInput
            className={`border rounded-md px-4 py-3 w-full text-base bg-gray-50 ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your name"
            value={formData.name}
            onChangeText={(value) => handleInputChange("name", value)}
            editable={!loading}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
          />
          {errors.name && (
            <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
          )}
        </View>
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
        {/* Register Button */}
        <TouchableOpacity
          className={`rounded-md w-full py-3 mt-2 mb-2 items-center ${
            !isFormValid || loading ? "opacity-50" : ""
          }`}
          style={{ backgroundColor: "#059669" }}
          onPress={handleRegister}
          disabled={!isFormValid || loading}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "Registering..." : "Register"}
          </Text>
        </TouchableOpacity>
        {/* Sign In Link */}
        <Text className="mt-2 text-gray-700 text-center">
          Already have an account?{" "}
          <Text
            className="font-semibold"
            style={{ color: "#059669" }}
            onPress={() => router.push("./login")}
          >
            Sign In
          </Text>
        </Text>
      </View>
      {/* Terms */}
      <Text className="text-xs text-gray-400 mt-8 text-center">
        By signing up, you agree to our{" "}
        <Text className="underline">Terms of Service</Text> and{" "}
        <Text className="underline">Privacy Policy</Text>
      </Text>
    </View>
  );
}
