import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch } from "react-native";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  Heart,
  User,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Edit,
  Camera,
  Activity,
  Target,
  Award,
} from "lucide-react-native";
import Card from "@/components/ui/card";

export default function ProfileDashboard() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const healthStats = [
    {
      label: "Health Score",
      value: "85",
      icon: Heart,
      color: "text-emerald-600",
    },
    {
      label: "Days Active",
      value: "23",
      icon: Activity,
      color: "text-blue-600",
    },
    {
      label: "Goals Met",
      value: "8/10",
      icon: Target,
      color: "text-purple-600",
    },
    {
      label: "Achievements",
      value: "12",
      icon: Award,
      color: "text-amber-600",
    },
  ];

  const menuItems = [
    {
      icon: Settings,
      title: "Account Settings",
      subtitle: "Manage your account",
    },
    { icon: Bell, title: "Notifications", subtitle: "Configure notifications" },
    {
      icon: Shield,
      title: "Privacy & Security",
      subtitle: "Manage your privacy",
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help and contact us",
    },
    { icon: LogOut, title: "Sign Out", subtitle: "Sign out of your account" },
  ];

  return (
    <LinearGradient
      colors={["#ecfdf5", "#f0fdfa"]}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerClassName="pb-8">
        {/* Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
                <User size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">Profile</Text>
                <Text className="text-sm text-gray-600">
                  Manage your account
                </Text>
              </View>
            </View>
            <TouchableOpacity className="p-2">
              <Settings size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 space-y-6 mt-4">
          {/* Profile Card */}
          <Card className="border-0">
            <View className="p-6">
              <View className="flex-row items-center mb-4">
                <View className="relative">
                  <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mr-4">
                    <User size={32} color="#059669" />
                  </View>
                  <TouchableOpacity className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-600 rounded-full items-center justify-center">
                    <Camera size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-800">
                    John Doe
                  </Text>
                  <Text className="text-gray-600">john.doe@example.com</Text>
                  <Text className="text-sm text-emerald-600">
                    Premium Member
                  </Text>
                </View>
                <TouchableOpacity className="p-2">
                  <Edit size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Health Stats */}
              <View className="grid grid-cols-2 gap-3">
                {healthStats.map((stat, index) => (
                  <View key={index} className="bg-gray-50 p-3 rounded-lg">
                    <View className="flex-row items-center justify-between mb-1">
                      <stat.icon
                        size={16}
                        color={stat.color
                          .replace("text-", "")
                          .replace("-600", "")}
                      />
                      <Text className="text-lg font-bold text-gray-800">
                        {stat.value}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600">{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Card>

          {/* Personal Information */}
          <Card className="border-0">
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Personal Information
              </Text>
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Full Name</Text>
                  <Text className="font-medium text-gray-800">John Doe</Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Email</Text>
                  <Text className="font-medium text-gray-800">
                    john.doe@example.com
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Phone</Text>
                  <Text className="font-medium text-gray-800">
                    +1 (555) 123-4567
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600">Date of Birth</Text>
                  <Text className="font-medium text-gray-800">
                    January 15, 1990
                  </Text>
                </View>
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600">Blood Type</Text>
                  <Text className="font-medium text-gray-800">O+</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* Preferences */}
          <Card className="border-0">
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Preferences
              </Text>
              <View className="space-y-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-medium text-gray-800">
                      Push Notifications
                    </Text>
                    <Text className="text-sm text-gray-600">
                      Receive health reminders
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                    thumbColor="#ffffff"
                  />
                </View>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-medium text-gray-800">Dark Mode</Text>
                    <Text className="text-sm text-gray-600">
                      Use dark theme
                    </Text>
                  </View>
                  <Switch
                    value={darkModeEnabled}
                    onValueChange={setDarkModeEnabled}
                    trackColor={{ false: "#d1d5db", true: "#10b981" }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
            </View>
          </Card>

          {/* Menu Items */}
          <Card className="border-0">
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                Settings
              </Text>
              <View className="space-y-1">
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center p-3 rounded-lg ${
                      index === menuItems.length - 1
                        ? "bg-red-50"
                        : "bg-gray-50"
                    }`}
                  >
                    <item.icon
                      size={20}
                      color={
                        index === menuItems.length - 1 ? "#ef4444" : "#64748b"
                      }
                      className="mr-3"
                    />
                    <View className="flex-1">
                      <Text
                        className={`font-medium ${
                          index === menuItems.length - 1
                            ? "text-red-600"
                            : "text-gray-800"
                        }`}
                      >
                        {item.title}
                      </Text>
                      <Text className="text-sm text-gray-600">
                        {item.subtitle}
                      </Text>
                    </View>
                    {/* ArrowRight icon is not imported, so it's commented out */}
                    {/* <ArrowRight size={16} color="#64748b" /> */}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Card>

          {/* App Version */}
          <View className="items-center py-4">
            <Text className="text-sm text-gray-500">
              Evra Health App v1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
