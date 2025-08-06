import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  Target,
} from "lucide-react-native";
import Card from "@/components/ui/card";
// @ts-ignore
import { tw } from "nativewind";

const { width, height } = Dimensions.get("window");

const walkthrough = [
  {
    id: "welcome",
    title: "Welcome to your Dashboard!",
    description: "Let's take a quick tour of your health dashboard.",
    target: { top: 80, left: width / 2 - 100 },
    spotlightSize: 200,
  },
  {
    id: "chat",
    title: "Chat with EVRA",
    description: "Get instant health guidance from your AI assistant.",
    target: { top: 60, left: 40 },
    spotlightSize: 140,
  },
  {
    id: "health-score",
    title: "Health Score",
    description: "Your overall health score based on various metrics.",
    target: { top: 110, right: 50 },
    spotlightSize: 160,
  },
  {
    id: "metrics",
    title: "Today's Metrics",
    description: "Track your daily health measurements here.",
    target: { top: 310, left: width / 2 - 150 },
    spotlightSize: 300,
  },
  {
    id: "tasks",
    title: "Today's Tasks",
    description: "Complete your daily health tasks to stay on track.",
    target: { top: 560, left: width / 2 - 150 },
    spotlightSize: 200,
  },
  {
    id: "goals",
    title: "Weekly Goals",
    description: "Monitor your progress towards weekly health goals.",
    target: { top: 760, left: width / 2 - 150 },
    spotlightSize: 200,
  },
];

export default function MainDashboard() {
  const router = useRouter();
  const [showWalkthrough, setShowWalkthrough] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [animation] = useState(new Animated.Value(1));
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

  const animateSpotlight = (toValue: number) => {
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleNext = () => {
    if (currentStep < walkthrough.length - 1) {
      animateSpotlight(0);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        animateSpotlight(1);
      }, 300);
    } else {
      setShowWalkthrough(false);
    }
  };

  const handleSkip = () => {
    setShowWalkthrough(false);
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      animateSpotlight(0);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        animateSpotlight(1);
      }, 300);
    }
  };

  const maskOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const spotlightScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {showWalkthrough && (
          <View
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              zIndex: 1000,
            }}
          >
            <Animated.View
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                backgroundColor: "black",
                opacity: maskOpacity,
              }}
            />

            <Animated.View
              style={{
                position: "absolute",
                ...walkthrough[currentStep].target,
                width: walkthrough[currentStep].spotlightSize,
                height: walkthrough[currentStep].spotlightSize,
                borderRadius: walkthrough[currentStep].spotlightSize / 2,
                backgroundColor: "transparent",
                borderWidth: 2,
                borderColor: "#059669",
                transform: [{ scale: spotlightScale }],
                shadowColor: "#059669",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 5,
              }}
            />

            <View
              style={{
                position: "absolute",
                padding: 20,
                width: "100%",
                bottom: 100,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#fff",
                  fontSize: 24,
                  fontWeight: "bold",
                  textAlign: "center",
                  marginBottom: 8,
                  textShadowColor: "rgba(0, 0, 0, 0.75)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {walkthrough[currentStep].title}
              </Text>
              <Text
                style={{
                  color: "#fff",
                  fontSize: 16,
                  textAlign: "center",
                  maxWidth: 300,
                  marginBottom: 24,
                  textShadowColor: "rgba(0, 0, 0, 0.75)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {walkthrough[currentStep].description}
              </Text>

              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity
                  onPress={handleSkip}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    backgroundColor: "#475569",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 16 }}>Skip Tour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleNext}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 8,
                    backgroundColor: "#059669",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 16 }}>
                    {currentStep === walkthrough.length - 1 ? "Finish" : "Next"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {/* Fixed Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4 z-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#114131" }}
              >
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
            {/* Health Score and Quick Actions Row */}
            <View className="flex-row justify-between mb-6">
              {/* Quick Actions - Left Side */}
              <View className="w-1/2 pr-2">
                <TouchableOpacity
                  onPress={() => router.push("./chat")}
                  className="mb-3"
                >
                  <Card className="border-0">
                    <View className="items-center p-4">
                      <MessageCircle
                        size={32}
                        color="#114131"
                        className="mb-2"
                      />
                      <Text className="text-sm font-medium text-gray-800">
                        Chat with EVRA
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
                <Card className="border-0">
                  <View className="items-center p-4">
                    <Calendar size={32} color="#114131" className="mb-2" />
                    <Text className="text-sm font-medium text-gray-800">
                      Book Appointment
                    </Text>
                  </View>
                </Card>
              </View>

              {/* Health Score - Right Side */}
              <View className="w-1/2 pl-2 items-center justify-center">
                <LinearGradient
                  colors={["#fed7aa", "#fde68a"]}
                  style={{
                    width: 160,
                    height: 160,
                    borderRadius: 80,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LinearGradient
                    colors={["#f97316", "#f59e0b"]}
                    style={{
                      width: 128,
                      height: 128,
                      borderRadius: 64,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text className="text-white text-sm font-medium">
                      Health Score
                    </Text>
                    <Text className="text-white text-4xl font-bold">84</Text>
                  </LinearGradient>
                </LinearGradient>
              </View>
            </View>

            {/* Health Metrics */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <TrendingUp size={20} color="#114131" className="mr-2" />
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
                            ? "text-green-700"
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
                  <Pill size={20} color="#114131" className="mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">
                    Today's Tasks
                  </Text>
                </View>
                {todaysTasks.map((item, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <View
                      className={`w-4 h-4 rounded-full border-2 items-center justify-center mr-3 ${
                        item.completed ? "border-gray-300" : "border-gray-300"
                      }`}
                    >
                      {item.completed && (
                        <View
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: "#114131" }}
                        />
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

            {/* Weekly Goals Summary */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Target size={20} color="#114131" className="mr-2" />
                    <Text className="text-lg font-semibold text-gray-800">
                      Weekly Goals
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: "#e6f4f1" }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: "#114131" }}
                    >
                      3/5
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="space-y-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: "#114131" }}
                      />
                      <Text className="text-sm text-gray-700 flex-1">
                        Complete 5 workouts
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">3/5</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: "#114131" }}
                      />
                      <Text className="text-sm text-gray-700 flex-1">
                        Drink 8 glasses daily
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">42/56</Text>
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                      <Text className="text-sm text-gray-700 flex-1">
                        Read 30 min daily
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">180/210</Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="mt-3 p-2 rounded-lg"
                  style={{ backgroundColor: "#e6f4f1" }}
                >
                  <Text
                    className="text-center text-sm font-medium"
                    style={{ color: "#114131" }}
                  >
                    View All Goals
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Recent Insights */}
            <Card className="border-0">
              <View
                className="p-4 rounded-lg"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text
                  className="text-sm font-medium mb-1"
                  style={{ color: "#114131" }}
                >
                  Great progress on your sleep schedule! 🌙
                </Text>
                <Text className="text-xs" style={{ color: "#114131" }}>
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
