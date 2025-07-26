import React from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  Heart,
  Activity,
  Moon,
  Droplets,
  MessageCircle,
  Calendar,
  Pill,
  TrendingUp,
  User,
  Settings,
  Bell,
} from "lucide-react-native";
import Card from "@/components/ui/card";
// @ts-ignore
import { tw } from "nativewind";

export default function MainDashboard() {
  const healthMetrics = [
    {
      icon: Heart,
      label: "Heart Rate",
      value: "72 bpm",
      status: "normal",
      color: "text-red-500",
    },
    {
      icon: Activity,
      label: "Steps",
      value: "8,432",
      status: "good",
      color: "text-blue-500",
    },
    {
      icon: Moon,
      label: "Sleep",
      value: "7.5 hrs",
      status: "good",
      color: "text-purple-500",
    },
    {
      icon: Droplets,
      label: "Hydration",
      value: "6/8 glasses",
      status: "needs attention",
      color: "text-cyan-500",
    },
  ];

  const todaysTasks = [
    { task: "Take morning vitamins", completed: true },
    { task: "Drink 2 more glasses of water", completed: false },
    { task: "Evening walk (30 min)", completed: false },
    { task: "Log dinner", completed: false },
  ];

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#ecfdf5", "#f0fdfa"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4 z-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
                <Heart size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">
                  Good morning, John!
                </Text>
                <Text className="text-sm text-gray-600">
                  Ready for a healthy day?
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Bell size={20} color="#64748b" className="mr-2" />
              <Settings size={20} color="#64748b" />
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <View className="px-4 space-y-6 mt-4">
            {/* Health Score */}
            <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0 mb-2">
              <View className="flex-row items-center justify-between p-6">
                <View>
                  <Text className="text-lg font-semibold text-white">
                    Health Score
                  </Text>
                  <Text className="text-emerald-100 text-sm">
                    Based on your daily activities
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-3xl font-bold text-white">85</Text>
                  <Text className="text-emerald-100 text-sm">Good</Text>
                </View>
              </View>
              {/* Simulated progress bar */}
              <View className="h-2 bg-emerald-400 rounded-full mx-6 mb-4">
                <View className="h-2 bg-white rounded-full w-[85%]" />
              </View>
            </Card>

            {/* Quick Actions */}
            <View className="flex-row justify-between mb-2">
              <Card className="border-0 flex-1 mr-2">
                <View className="items-center p-4">
                  <MessageCircle size={32} color="#059669" className="mb-2" />
                  <Text className="text-sm font-medium text-gray-800">
                    Chat with AI Coach
                  </Text>
                </View>
              </Card>
              <Card className="border-0 flex-1 ml-2">
                <View className="items-center p-4">
                  <Calendar size={32} color="#059669" className="mb-2" />
                  <Text className="text-sm font-medium text-gray-800">
                    Book Appointment
                  </Text>
                </View>
              </Card>
            </View>

            {/* Health Metrics */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <TrendingUp size={20} color="#059669" className="mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">
                    Today's Metrics
                  </Text>
                </View>
                {healthMetrics.map((metric, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between mb-2"
                  >
                    <View className="flex-row items-center">
                      <metric.icon
                        size={20}
                        color={metric.color
                          .replace("text-", "")
                          .replace("-500", "")}
                        className="mr-2"
                      />
                      <Text className="text-sm font-medium text-gray-700">
                        {metric.label}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-sm font-semibold text-gray-800">
                        {metric.value}
                      </Text>
                      <Text
                        className={`text-xs ${
                          metric.status === "normal" || metric.status === "good"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      >
                        {metric.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* Today's Tasks */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <Pill size={20} color="#059669" className="mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">
                    Today's Tasks
                  </Text>
                </View>
                {todaysTasks.map((item, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <View
                      className={`w-4 h-4 rounded-full border-2 items-center justify-center mr-3 ${
                        item.completed
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {item.completed && (
                        <View className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </View>
                    <Text
                      className={`text-sm ${
                        item.completed
                          ? "text-gray-500 line-through"
                          : "text-gray-800"
                      }`}
                    >
                      {item.task}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Recent Insights */}
            <Card className="border-0">
              <View className="p-4 bg-emerald-50 rounded-lg">
                <Text className="text-sm text-emerald-800 font-medium mb-1">
                  Great progress on your sleep schedule! 🌙
                </Text>
                <Text className="text-xs text-emerald-700">
                  You've maintained 7+ hours of sleep for 5 consecutive days.
                  Keep it up!
                </Text>
              </View>
            </Card>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
