import { Tabs, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Heart,
  MessageCircle,
  ShoppingBag,
  Pill,
  User,
  Target,
} from "lucide-react-native";
import { UserProvider } from "@/context/UserContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function TabsNavigator() {
  const { isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const userEmail = (params?.email as string) || "";
  const userName = (params?.name as string) || "";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
          borderTopColor: isDarkMode ? "#374151" : "#e5e7eb",
        },
        tabBarActiveTintColor: isDarkMode ? "#34d399" : "#059669",
        tabBarInactiveTintColor: isDarkMode ? "#9ca3af" : "#64748b",
      }}
    >
      <Tabs.Screen
        name="main"
        options={{
          title: "Dashboard",
          tabBarLabel: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarLabel: "Chat",
          tabBarIcon: ({ color, size }) => (
            <MessageCircle color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: "Goals",
          tabBarLabel: "Goals",
          tabBarIcon: ({ color, size }) => (
            <Target color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarLabel: "Orders",
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="supplements"
        options={{
          title: "Supplements",
          tabBarLabel: "Supplements",
          tabBarIcon: ({ color, size }) => (
            <Pill color={color} size={size ?? 22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        initialParams={{
          email: userEmail,
          name: userName,
        }}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <User color={color} size={size ?? 22} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function DashboardTabsLayout() {
  const params = useLocalSearchParams();
  const userEmail = (params?.email as string) || "";
  const userName = (params?.name as string) || "";

  return (
    <ThemeProvider>
      <UserProvider value={{ userEmail, userName }}>
        <TabsNavigator />
      </UserProvider>
    </ThemeProvider>
  );
}
