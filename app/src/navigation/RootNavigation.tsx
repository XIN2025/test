import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import TabsNavigator from "./TabsNavigator";
import { AuthStack } from "./AuthStack";
import { useAuthStore } from "../stores/auth.store";
import { initializeAuth } from "../stores/auth.store";
import { View, ActivityIndicator } from "react-native";

const RootNavigation = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabsNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigation;
