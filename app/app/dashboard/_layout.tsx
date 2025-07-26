import { Tabs } from "expo-router";
import React, { useState } from "react";
import WalkthroughModal from "../WalkthroughModal";
// @ts-ignore
import {
  Heart,
  MessageCircle,
  ShoppingBag,
  Pill,
  User,
  Target,
} from "lucide-react-native";

export default function DashboardTabsLayout() {
  const [showWalkthrough, setShowWalkthrough] = useState(true);

  const handleFinishWalkthrough = () => {
    setShowWalkthrough(false);
  };

  return (
    <>
      {showWalkthrough && (
        <WalkthroughModal onFinish={handleFinishWalkthrough} />
      )}
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
          options={{
            title: "Profile",
            tabBarLabel: "Profile",
            tabBarIcon: ({ color, size }) => (
              <User color={color} size={size ?? 22} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
