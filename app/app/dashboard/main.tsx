import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
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
  TrendingUp,
  User,
  Settings,
  Bell,
  Target,
} from "lucide-react-native";
import Card from "@/components/ui/card";
import { CircularProgressRing } from "@/components/CircularProgressRing";
import { useActionCompletions } from "@/hooks/useActionCompletions";
// @ts-ignore
import { tw } from "nativewind";
import { useGoals } from "@/hooks/useGoals";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const userEmail = user?.email || "";
  const userName = user?.name || "";
  const { goals, loadGoals } = useGoals({ userEmail });
  const {
    completionStats,
    getGoalCompletionPercentage,
    markCompletion,
    loadCompletionStats,
    loading: completionLoading,
  } = useActionCompletions(userEmail);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [animation] = useState(new Animated.Value(1));
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showAllTodayItems, setShowAllTodayItems] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<
    Map<string, number>
  >(new Map());

  // Refresh goals data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userEmail) {
        if (loadGoals) {
          loadGoals();
        }
        if (loadCompletionStats) {
          loadCompletionStats();
        }
      }
    }, [userEmail, loadGoals, loadCompletionStats])
  );
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

  // Removed local demo tasks; weekly goals are now sourced from API via useGoals

  // Determine the key for today's day name used in schedules
  const dayKey = useMemo(() => {
    const day = new Date().getDay(); // 0=Sun..6=Sat
    return (
      [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ][day] || "monday"
    );
  }, []);

  // Per-user storage key for walkthrough completion
  const walkthroughStorageKey = useMemo(
    () => `dashboardWalkthroughSeen:${userEmail || "guest"}`,
    [userEmail]
  );

  // Only show walkthrough if not completed before for this user
  useEffect(() => {
    const checkWalkthrough = async () => {
      try {
        const seen = await AsyncStorage.getItem(walkthroughStorageKey);
        setShowWalkthrough(!seen);
      } catch (e) {
        setShowWalkthrough(false);
      }
    };
    checkWalkthrough();
  }, [walkthroughStorageKey]);

  type TodayItem = {
    id: string;
    title: string;
    start_time?: string;
    end_time?: string;
    goalTitle?: string;
  };

  // Helper to format time into HH:MM
  const formatTimeHM = (t?: string): string => {
    if (!t) return "";
    const parts = `${t}`.trim().split(":");
    if (parts.length >= 2) {
      const hh = (parts[0] ?? "0").padStart(2, "0");
      const mm = (parts[1] ?? "0").padStart(2, "0");
      return `${hh}:${mm}`;
    }
    const h = parts[0];
    if (h && /^\d{1,2}$/.test(h)) return `${h.padStart(2, "0")}:00`;
    return t;
  };

  // Build today's action items from goals data
  const todaysItems: TodayItem[] = useMemo(() => {
    const items: TodayItem[] = [];

    const normalizeTime = (t?: string): string => formatTimeHM(t);

    const makeKey = (
      title: string,
      goalTitle: string | undefined,
      start?: string,
      end?: string
    ) => {
      const normTitle = (title || "").trim().toLowerCase();
      const normGoal = (goalTitle || "").trim().toLowerCase();
      const normStart = normalizeTime(start);
      const normEnd = normalizeTime(end);
      return `${normGoal}|${normTitle}|${normStart}|${normEnd}`;
    };

    const seen = new Set<string>();

    (goals as any[]).forEach((g: any) => {
      // 1) From goal.weekly_schedule.daily_schedules[dayKey]
      const ds = g?.weekly_schedule?.daily_schedules?.[dayKey];
      if (ds?.time_slots?.length) {
        ds.time_slots.forEach((ts: any, idx: number) => {
          const title = ts.action_item || g.title;
          const key = makeKey(title, g.title, ts.start_time, ts.end_time);
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: `${g.id}-top-${dayKey}-${idx}`,
              title,
              start_time: ts.start_time,
              end_time: ts.end_time,
              goalTitle: g.title,
            });
          }
        });
      }

      // 2) From goal.action_plan.action_items[].weekly_schedule[dayKey].time_slots
      const actionItems = g?.action_plan?.action_items || [];
      actionItems.forEach((ai: any, aIdx: number) => {
        const w = ai?.weekly_schedule?.[dayKey];
        const slots = w?.time_slots || [];
        slots.forEach((ts: any, sIdx: number) => {
          const key = makeKey(ai.title, g.title, ts.start_time, ts.end_time);
          if (!seen.has(key)) {
            seen.add(key);
            items.push({
              id: `${g.id}-ai-${aIdx}-${dayKey}-${sIdx}`,
              title: ai.title,
              start_time: ts.start_time,
              end_time: ts.end_time,
              goalTitle: g.title,
            });
          }
        });
      });
    });

    // Sort by normalized time if available
    items.sort((a, b) =>
      formatTimeHM(a.start_time).localeCompare(formatTimeHM(b.start_time))
    );
    return items;
  }, [goals, dayKey]);

  // Helper to check if an action item is completed for the current week
  const isActionItemCompletedThisWeek = useCallback(
    (actionItem: any): boolean => {
      if (!actionItem?.weekly_completion) {
        console.log(
          `No weekly_completion data for action item: ${actionItem?.title}`
        );
        return false;
      }

      // Get the start of the current week (Monday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      console.log(
        `Checking weekly completion for ${
          actionItem.title
        }, current week start: ${weekStart.toDateString()}`
      );
      console.log(`Weekly completion data:`, actionItem.weekly_completion);

      // Check if there's a completion entry for this week
      const isComplete = actionItem.weekly_completion.some(
        (completion: any) => {
          const completionWeekStart = new Date(completion.week_start);
          const matches =
            completionWeekStart.toDateString() === weekStart.toDateString();
          console.log(
            `  Week ${completionWeekStart.toDateString()}: complete=${
              completion.is_complete
            }, matches=${matches}`
          );
          return matches && completion.is_complete;
        }
      );

      console.log(`Final result for ${actionItem.title}: ${isComplete}`);
      return isComplete;
    },
    []
  );

  // Sync completed items from backend completion stats (with delay to allow backend processing)
  useEffect(() => {
    if (!todaysItems.length) return;

    // Add a small delay to allow recent API calls to complete
    const timeoutId = setTimeout(() => {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
      const now = Date.now();
      const newCompletedItems = new Set(completedItems); // Start with current state

      // Check each today's item against completion stats and weekly completion status
      todaysItems.forEach((item) => {
        const goalId = item.id.split("-")[0];
        const goalStats = completionStats?.[goalId];

        // Skip if this item was recently interacted with (within last 5 seconds)
        const lastInteraction = recentInteractions.get(item.id);
        if (lastInteraction && now - lastInteraction < 5000) {
          return; // Don't override recent user interaction
        }

        // First check weekly completion status from action items
        let isCompletedByWeeklyStatus = false;
        const goal = (goals as any[]).find((g: any) => g.id === goalId);
        if (goal?.action_plan?.action_items) {
          const actionItem = goal.action_plan.action_items.find(
            (ai: any) => ai.title === item.title
          );
          if (actionItem) {
            isCompletedByWeeklyStatus =
              isActionItemCompletedThisWeek(actionItem);
          }
        }

        // Then check daily completion stats as fallback
        let isCompletedByDailyStats = false;
        if (goalStats?.daily_stats) {
          // Find today's stats
          const todayStats = goalStats.daily_stats.find((ds: any) => {
            const statsDate = new Date(ds.date).toISOString().split("T")[0];
            return statsDate === today;
          });

          // If this action item is in today's completed items list, mark as completed
          if (todayStats?.action_items?.includes(item.title)) {
            isCompletedByDailyStats = true;
          }
        }

        // Use either weekly completion status or daily stats
        if (isCompletedByWeeklyStatus || isCompletedByDailyStats) {
          newCompletedItems.add(item.id);
        } else {
          // If not completed by either method, remove from completed state
          newCompletedItems.delete(item.id);
        }
      });

      setCompletedItems(newCompletedItems);
    }, 100); // 100ms delay

    return () => clearTimeout(timeoutId);
  }, [
    completionStats,
    todaysItems,
    recentInteractions,
    goals,
    isActionItemCompletedThisWeek,
  ]);

  // Clean up old interactions
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setRecentInteractions((prev) => {
        const newMap = new Map();
        prev.forEach((timestamp, id) => {
          if (now - timestamp < 10000) {
            // Keep interactions for 10 seconds
            newMap.set(id, timestamp);
          }
        });
        return newMap;
      });
    }, 5000); // Clean up every 5 seconds

    return () => clearInterval(cleanup);
  }, []);

  const toggleItemCompleted = async (id: string) => {
    // Find the action item details from todaysItems
    const actionItem = todaysItems.find((item) => item.id === id);
    if (!actionItem) return;

    // Extract goal ID from the item ID (format: goalId-top-dayKey-index or goalId-ai-aIdx-dayKey-sIdx)
    const goalId = actionItem.id.split("-")[0];

    // Mark this item as recently interacted with
    setRecentInteractions((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, Date.now());
      return newMap;
    });

    // Toggle local state immediately for UI responsiveness
    setCompletedItems((prev) => {
      const next = new Set(prev);
      const isCompleted = next.has(id);

      if (isCompleted) {
        next.delete(id);
      } else {
        next.add(id);
      }

      // Call API to mark completion
      markCompletion(goalId, actionItem.title, !isCompleted)
        .then(() => {
          // Add a small delay to allow backend processing to complete
          setTimeout(() => {
            // Refresh goals data to get the updated weekly completion status
            if (loadGoals) {
              loadGoals();
            }
            // Also refresh completion stats
            if (loadCompletionStats) {
              loadCompletionStats();
            }
          }, 500); // 500ms delay to allow backend processing
        })
        .catch((error) => {
          console.error("Failed to mark completion:", error);
          // Revert local state on error
          setCompletedItems((prevState) => {
            const revertSet = new Set(prevState);
            if (isCompleted) {
              revertSet.add(id);
            } else {
              revertSet.delete(id);
            }
            return revertSet;
          });
        });

      return next;
    });
  };

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
      // Persist completion so walkthrough shows only once per user
      AsyncStorage.setItem(walkthroughStorageKey, "true").catch(() => {});
    }
  };

  const handleSkip = () => {
    setShowWalkthrough(false);
    AsyncStorage.setItem(walkthroughStorageKey, "true").catch(() => {});
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
        colors={isDarkMode ? ["#0f172a", "#1e293b"] : ["#f0f9f6", "#e6f4f1"]}
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
        <View
          className={`shadow-sm px-4 py-4 z-10 ${
            isDarkMode
              ? "bg-gray-900 border-b border-gray-800"
              : "bg-white border-b border-gray-100"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  isDarkMode ? "bg-emerald-900" : "bg-emerald-800"
                }`}
              >
                <Heart size={20} color="#fff" />
              </View>
              <View>
                <Text
                  className={`font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  {`Good morning, ${userName || "User"}!`}
                </Text>
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Ready for a healthy day?
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Bell
                size={20}
                color={isDarkMode ? "#9ca3af" : "#64748b"}
                className="mr-2"
              />
              <Settings size={20} color={isDarkMode ? "#9ca3af" : "#64748b"} />
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
                    <View
                      className={`items-center p-4 rounded-xl ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      }`}
                    >
                      <MessageCircle
                        size={32}
                        color={isDarkMode ? "#34d399" : "#114131"}
                        className="mb-2"
                      />
                      <Text
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        Chat with EVRA
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
                <Card className="border-0">
                  <View
                    className={`items-center p-4 rounded-xl ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <Calendar
                      size={32}
                      color={isDarkMode ? "#34d399" : "#114131"}
                      className="mb-2"
                    />
                    <Text
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
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
              <View
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="flex-row items-center mb-3">
                  <TrendingUp
                    size={20}
                    color={isDarkMode ? "#34d399" : "#114131"}
                    className="mr-2"
                  />
                  <Text
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
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
                        color={
                          isDarkMode
                            ? metric.color
                                .replace("text-", "")
                                .replace("-500", "-400")
                            : metric.color
                                .replace("text-", "")
                                .replace("-500", "")
                        }
                        className="mr-2"
                      />
                      <Text
                        className={`text-sm font-medium ${
                          isDarkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {metric.label}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        className={`text-sm font-semibold ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        {metric.value}
                      </Text>
                      <Text
                        className={`text-xs ${
                          metric.status === "normal" || metric.status === "good"
                            ? isDarkMode
                              ? "text-green-400"
                              : "text-green-700"
                            : isDarkMode
                            ? "text-amber-400"
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

            {/* Today's Action Items (collapsible) */}
            <Card className="border-0">
              <View
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="flex-row items-center mb-3">
                  <Text
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-gray-100" : "text-gray-800"
                    }`}
                  >
                    Today's Action Items
                  </Text>
                </View>
                {todaysItems.length === 0 ? (
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    No scheduled items for today.
                  </Text>
                ) : (
                  (showAllTodayItems
                    ? todaysItems
                    : todaysItems.slice(0, 3)
                  ).map((it) => (
                    <View
                      key={it.id}
                      className="flex-row items-center justify-between mb-3"
                    >
                      <View className="flex-row items-center flex-1">
                        <TouchableOpacity
                          onPress={() => toggleItemCompleted(it.id)}
                          className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                            isDarkMode ? "border-gray-600" : "border-gray-300"
                          }`}
                        >
                          {completedItems.has(it.id) && (
                            <View
                              className={`w-3 h-3 rounded ${
                                isDarkMode ? "bg-emerald-500" : "bg-emerald-600"
                              }`}
                            />
                          )}
                        </TouchableOpacity>
                        <View className="flex-1">
                          <Text
                            className={`text-sm ${
                              completedItems.has(it.id)
                                ? isDarkMode
                                  ? "text-gray-500 line-through"
                                  : "text-gray-500 line-through"
                                : isDarkMode
                                ? "text-gray-100"
                                : "text-gray-800"
                            }`}
                          >
                            {it.title}
                          </Text>
                          {it.goalTitle && (
                            <Text
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {it.goalTitle}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="items-end ml-3">
                        <Text
                          className={`text-xs font-medium ${
                            isDarkMode ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {it.start_time && it.end_time
                            ? `${formatTimeHM(it.start_time)} - ${formatTimeHM(
                                it.end_time
                              )}`
                            : formatTimeHM(it.start_time) ||
                              formatTimeHM(it.end_time) ||
                              ""}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {todaysItems.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowAllTodayItems((v) => !v)}
                    className="mt-1 self-start px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: isDarkMode ? "#34d399" : "#114131" }}
                    >
                      {showAllTodayItems
                        ? "Show less"
                        : `Show all (${todaysItems.length})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>

            {/* Removed Today's Tasks card */}

            {/* Weekly Goals Summary (from goals endpoint) */}
            <Card className="border-0">
              <View
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Target
                      size={20}
                      color={isDarkMode ? "#34d399" : "#114131"}
                      className="mr-2"
                    />
                    <Text
                      className={`text-lg font-semibold ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      Weekly Goals
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="px-3 py-1 rounded-full"
                    style={{
                      backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: isDarkMode ? "#34d399" : "#114131",
                      }}
                    >
                      {`${
                        (goals || []).filter((g: any) => g.completed).length
                      }/${(goals || []).length}`}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(goals || []).length === 0 ? (
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    No goals yet.
                  </Text>
                ) : (
                  <View className="space-y-3">
                    {(goals as any[]).slice(0, 5).map((g: any) => {
                      const completionPercentage = getGoalCompletionPercentage(
                        g.id
                      );
                      return (
                        <View
                          key={g.id}
                          className="flex-row items-center justify-between"
                        >
                          <View className="flex-row items-center flex-1">
                            {/* Circular Progress Ring */}
                            <View className="mr-3">
                              <CircularProgressRing
                                size={40}
                                strokeWidth={3}
                                progress={completionPercentage}
                                color={
                                  completionPercentage >= 80
                                    ? "#10b981" // Green for high completion
                                    : completionPercentage >= 50
                                    ? "#f59e0b" // Yellow for medium completion
                                    : "#ef4444" // Red for low completion
                                }
                                backgroundColor={
                                  isDarkMode ? "#374151" : "#e5e7eb"
                                }
                                showPercentage={false}
                                textColor={isDarkMode ? "#d1d5db" : "#374151"}
                              />
                            </View>
                            <View className="flex-1">
                              <Text
                                className={`text-sm font-medium ${
                                  isDarkMode ? "text-gray-200" : "text-gray-800"
                                }`}
                              >
                                {g.title}
                              </Text>
                              <Text
                                className={`text-xs ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {completionPercentage.toFixed(0)}% completed
                                this week
                              </Text>
                            </View>
                          </View>
                          <View className="items-end">
                            <View
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: g.completed
                                  ? isDarkMode
                                    ? "#34d399"
                                    : "#10b981"
                                  : isDarkMode
                                  ? "#4b5563"
                                  : "#94a3b8",
                              }}
                            />
                            <Text
                              className={`text-xs mt-1 ${
                                isDarkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {g.completed ? "Done" : "Active"}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                <TouchableOpacity
                  className="mt-3 p-2 rounded-lg"
                  style={{
                    backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                  }}
                  onPress={() => router.push("./goals")}
                >
                  <Text
                    className="text-center text-sm font-medium"
                    style={{
                      color: isDarkMode ? "#34d399" : "#114131",
                    }}
                  >
                    View All Goals
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Recent Insights */}
            <Card className="border-0">
              <View
                className={`p-4 rounded-lg ${
                  isDarkMode ? "bg-emerald-900/70" : "bg-emerald-100"
                }`}
              >
                <Text
                  className={`text-sm font-medium mb-1 ${
                    isDarkMode ? "text-emerald-100" : "text-emerald-900"
                  }`}
                >
                  Great progress on your sleep schedule! 🌙
                </Text>
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-200" : "text-emerald-800"
                  }`}
                >
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
