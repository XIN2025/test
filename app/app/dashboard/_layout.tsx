import { Tabs, useLocalSearchParams } from "expo-router";
import React from "react";
// @ts-ignore
import {
  Heart,
  MessageCircle,
  ShoppingBag,
  Pill,
  User,
  Target,
} from "lucide-react-native";
import { UserProvider } from "@/context/UserContext";

export default function DashboardTabsLayout() {
  const params = useLocalSearchParams();
  const userEmail = (params?.email as string) || "";
  const userName = (params?.name as string) || "";
  return (
    <UserProvider value={{ userEmail, userName }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#059669",
          tabBarInactiveTintColor: "#64748b",
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
            name: userName
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
    </UserProvider>
  );
}
