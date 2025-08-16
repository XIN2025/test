import React, { useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page if not authenticated
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <LinearGradient
        colors={isDarkMode ? ["#0f172a", "#1e293b"] : ["#f0f9f6", "#e6f4f1"]}
        className="flex-1 justify-center items-center"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ActivityIndicator
          size="large"
          color={isDarkMode ? "#34d399" : "#059669"}
        />
        <Text
          className={`mt-4 text-lg ${
            isDarkMode ? "text-gray-100" : "text-gray-800"
          }`}
        >
          Loading...
        </Text>
      </LinearGradient>
    );
  }

  // If not authenticated, return null (will redirect to login)
  if (!isAuthenticated) {
    return null;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
}
