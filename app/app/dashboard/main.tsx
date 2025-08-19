import React, { useState, useEffect, useMemo, useCallback } from "react";
import Constants from "expo-constants";
import { Modal, Pressable } from "react-native";
import { Flame } from "lucide-react-native";
import axios from "axios";
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
import { goalsApi } from "../../services/goalsApi";

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

// --- Helper function to render streak achievements ---
function renderStreakAchievements(streak: number | null, isDarkMode: boolean) {
  // Define milestones and their labels
  const milestones = [
    { weeks: 1, label: "First Streak!" },
    { weeks: 2, label: "2 Weeks!" },
    { weeks: 4, label: "1 Month Streak!" },
    { weeks: 8, label: "2 Months!" },
    { weeks: 12, label: "3 Months!" },
    { weeks: 24, label: "6 Months!" },
    { weeks: 52, label: "1 Year!" },
  ];
  if (streak == null) {
    return (
      <Text
        style={{
          color: isDarkMode ? "#e5e7eb" : "#374151",
          fontSize: 15,
          textAlign: "center",
        }}
      >
        Achievements will appear here as you build your streak!
      </Text>
    );
  }
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Text
        style={{
          color: isDarkMode ? "#fbbf24" : "#f59e42",
          fontWeight: "bold",
          fontSize: 16,
          marginBottom: 6,
          textAlign: "center",
        }}
      >
        {`Current Streak: ${streak} week${streak > 1 ? "s" : ""}`}
      </Text>
      {/* List all achievements, tagging unlocked/locked */}
      {milestones.map((m) => {
        const unlocked = streak >= m.weeks;
        return (
          <View
            key={m.weeks}
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              opacity: unlocked ? 1 : 0.5,
            }}
          >
            <Flame
              size={22}
              color={
                unlocked
                  ? isDarkMode
                    ? "#fbbf24"
                    : "#f59e42"
                  : isDarkMode
                  ? "#64748b"
                  : "#cbd5e1"
              }
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: unlocked
                  ? isDarkMode
                    ? "#fbbf24"
                    : "#f59e42"
                  : isDarkMode
                  ? "#64748b"
                  : "#64748b",
                fontWeight: unlocked ? "bold" : "normal",
                fontSize: 15,
              }}
            >
              {m.label}
            </Text>
            <Text
              style={{
                color: unlocked
                  ? isDarkMode
                    ? "#22c55e"
                    : "#059669"
                  : isDarkMode
                  ? "#64748b"
                  : "#64748b",
                fontSize: 13,
                marginLeft: 8,
                fontWeight: "bold",
              }}
            >
              {unlocked ? "Unlocked" : "Locked"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MainDashboard() {
  const API_BASE_URL =
    Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = user?.name || "";
  // --- Daily Completion for Streak Calendar ---
  const [dailyCompletion, setDailyCompletion] = useState<
    Record<string, number>
  >({});
  const router = useRouter();
  const { isDarkMode } = useTheme();
  useEffect(() => {
    if (!userEmail) return;
    const today = new Date();
    goalsApi
      .getDailyCompletion(userEmail, today.getMonth() + 1, today.getFullYear())
      .then((completionData) => {
        setDailyCompletion(completionData);
      })
      .catch(() => setDailyCompletion({}));
  }, [userEmail]);
  // ...existing code...

  // --- Streak Modal State and Logic ---
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakError, setStreakError] = useState<string | null>(null);
  const [streakTab, setStreakTab] = useState<"calendar" | "achievements">(
    "calendar"
  );
  const fetchStreak = useCallback(async () => {
    if (!userEmail) return;
    setStreakLoading(true);
    setStreakError(null);
    try {
      const stats = await goalsApi.getGoalStats(userEmail, 12);
      setStreak(stats?.weekly_streak ?? 0);
    } catch (e) {
      setStreakError("Failed to load streak");
    } finally {
      setStreakLoading(false);
    }
  }, [userEmail]);
  const openStreakModal = () => {
    setShowStreakModal(true);
    fetchStreak();
  };
  const closeStreakModal = () => setShowStreakModal(false);
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
              <Pressable
                onPress={openStreakModal}
                style={{ marginRight: 12 }}
                accessibilityLabel="Show Streak"
              >
                <Flame size={22} color={isDarkMode ? "#fbbf24" : "#f59e42"} />
              </Pressable>
              <Bell
                size={20}
                color={isDarkMode ? "#9ca3af" : "#64748b"}
                className="mr-2"
              />
              <Settings size={20} color={isDarkMode ? "#9ca3af" : "#64748b"} />
            </View>
            {/* Streak Modal */}
            <Modal
              visible={showStreakModal}
              animationType="slide"
              transparent
              onRequestClose={closeStreakModal}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    backgroundColor: isDarkMode ? "#1e293b" : "#fff",
                    borderRadius: 16,
                    padding: 28,
                    minWidth: 340,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  {/* Tabs */}
                  <View
                    style={{
                      flexDirection: "row",
                      marginBottom: 18,
                      width: "100%",
                    }}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: 2,
                        borderBottomColor:
                          streakTab === "calendar"
                            ? isDarkMode
                              ? "#fbbf24"
                              : "#f59e42"
                            : "transparent",
                      }}
                      onPress={() => setStreakTab("calendar")}
                    >
                      <Text
                        style={{
                          color:
                            streakTab === "calendar"
                              ? isDarkMode
                                ? "#fbbf24"
                                : "#f59e42"
                              : isDarkMode
                              ? "#e5e7eb"
                              : "#374151",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        Calendar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 8,
                        borderBottomWidth: 2,
                        borderBottomColor:
                          streakTab === "achievements"
                            ? isDarkMode
                              ? "#fbbf24"
                              : "#f59e42"
                            : "transparent",
                      }}
                      onPress={() => setStreakTab("achievements")}
                    >
                      <Text
                        style={{
                          color:
                            streakTab === "achievements"
                              ? isDarkMode
                                ? "#fbbf24"
                                : "#f59e42"
                              : isDarkMode
                              ? "#e5e7eb"
                              : "#374151",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        Achievements
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tab Content */}
                  {streakTab === "calendar" ? (
                    <>
                      <Flame
                        size={40}
                        color={isDarkMode ? "#fbbf24" : "#f59e42"}
                      />
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "bold",
                          marginTop: 12,
                          color: isDarkMode ? "#fbbf24" : "#f59e42",
                        }}
                      >
                        {streakLoading
                          ? "Loading..."
                          : streakError
                          ? streakError
                          : `🔥 ${streak ?? 0} week streak!`}
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          color: isDarkMode ? "#e5e7eb" : "#374151",
                          marginTop: 8,
                          textAlign: "center",
                          maxWidth: 260,
                        }}
                      >
                        {streak && streak > 0
                          ? `You've completed your goals for ${streak} consecutive week${
                              streak > 1 ? "s" : ""
                            }! Keep it up!`
                          : "Complete your goals each week to build your streak."}
                      </Text>
                      {/* Calendar Streak View */}
                      <View style={{ marginTop: 24, marginBottom: 16 }}>
                        <Text
                          style={{
                            color: isDarkMode ? "#fbbf24" : "#f59e42",
                            fontWeight: "bold",
                            fontSize: 16,
                            marginBottom: 8,
                            textAlign: "center",
                          }}
                        >
                          Weekly Streak Calendar
                        </Text>
                        <StreakCalendar
                          isDarkMode={isDarkMode}
                          dailyCompletion={dailyCompletion}
                        />
                      </View>
                    </>
                  ) : (
                    <View
                      style={{
                        alignItems: "center",
                        width: 260,
                        minHeight: 260,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "bold",
                          color: isDarkMode ? "#fbbf24" : "#f59e42",
                          marginBottom: 12,
                          textAlign: "center",
                        }}
                      >
                        Streak Achievements
                      </Text>
                      {renderStreakAchievements(streak, isDarkMode)}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={closeStreakModal}
                    style={{
                      marginTop: 8,
                      backgroundColor: isDarkMode ? "#059669" : "#e6f4f1",
                      paddingVertical: 10,
                      paddingHorizontal: 32,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: isDarkMode ? "#fff" : "#059669",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* --- Streak Calendar Component --- */}
            {/*
              Dummy data: Array of last 12 weeks, true = streak, false = missed
              You can replace this with real data if available.
            */}
            {/*
              Place this at the bottom of your file, outside the MainDashboard component:
            */}
            {/* 
            Example usage:
              <StreakCalendar isDarkMode={isDarkMode} />
            */}
            {/* --- End Streak Calendar Component --- */}
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

type StreakCalendarProps = {
  isDarkMode: boolean;
  dailyCompletion: Record<string, number>;
};

/**
 * Renders a 12-week streak calendar with colored circles for each week.
 * Replace the dummy data with real streak data if available.
 */
/**
 * Renders a 6-row monthly calendar where each day shows a colored circle
 * representing the number of action items completed that day.
 * The more completed, the more "filled" the color (green for high, yellow for medium, gray for none).
 * Expects real completion data via AsyncStorage or props if available.
 */

export function StreakCalendar({
  isDarkMode,
  dailyCompletion,
}: StreakCalendarProps) {
  // Map dailyCompletion (YYYY-MM-DD) to day number for current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const completedPerDay = useMemo(() => {
    const map: Record<number, number> = {};
    Object.entries(dailyCompletion).forEach(([date, count]) => {
      const d = new Date(date);
      if (d.getMonth() === month && d.getFullYear() === year) {
        map[d.getDate()] = count as number;
      }
    });
    return map;
  }, [dailyCompletion, month, year]);

  // Get first day of the month (0=Sun..6=Sat)
  const firstDay = new Date(year, month, 1).getDay();
  // Get number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid: 6 rows of 7 days (to fit all months)
  const calendar: { day: number | null }[][] = [];
  let day = 1;
  for (let row = 0; row < 6; row++) {
    const week: { day: number | null }[] = [];
    for (let col = 0; col < 7; col++) {
      if ((row === 0 && col < firstDay) || day > daysInMonth) {
        week.push({ day: null });
      } else {
        week.push({ day });
        day++;
      }
    }
    calendar.push(week);
  }

  // Helper: get color for a given completed count
  function getDayColor(count: number) {
    if (count >= 4) return isDarkMode ? "#22d3ee" : "#059669"; // teal/green for high
    if (count >= 2) return isDarkMode ? "#fbbf24" : "#f59e42"; // yellow/orange for medium
    if (count === 1) return isDarkMode ? "#a3e635" : "#84cc16"; // lime for low
    return isDarkMode ? "#334155" : "#e5e7eb"; // gray for none
  }

  // Helper: get text color for a given completed count
  function getTextColor(count: number) {
    if (count > 0) return isDarkMode ? "#1e293b" : "#fff";
    return isDarkMode ? "#64748b" : "#64748b";
  }

  // Helper: get border color for a given completed count
  function getBorderColor(count: number) {
    if (count >= 4) return isDarkMode ? "#22d3ee" : "#059669";
    if (count >= 2) return isDarkMode ? "#fbbf24" : "#f59e42";
    if (count === 1) return isDarkMode ? "#a3e635" : "#84cc16";
    return isDarkMode ? "#64748b" : "#cbd5e1";
  }

  // Helper: get size for a given completed count
  function getCircleSize(count: number) {
    if (count >= 4) return 32;
    if (count >= 2) return 28;
    if (count === 1) return 24;
    return 22;
  }

  return (
    <View style={{ alignItems: "center" }}>
      {/* Month and year */}
      <Text
        style={{
          color: isDarkMode ? "#fbbf24" : "#f59e42",
          fontWeight: "bold",
          fontSize: 17,
          marginBottom: 6,
        }}
      >
        {today.toLocaleString("default", { month: "long" })} {year}
      </Text>
      {/* Weekday headers */}
      <View style={{ flexDirection: "row", marginBottom: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
          <Text
            key={d}
            style={{
              width: 36,
              textAlign: "center",
              color: isDarkMode ? "#fbbf24" : "#f59e42",
              fontWeight: "bold",
              fontSize: 14,
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      {/* Calendar grid */}
      {calendar.map((week, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: "row", marginBottom: 6 }}>
          {week.map((cell, colIdx) => {
            const count = cell.day ? completedPerDay[cell.day] ?? 0 : 0;
            const isToday =
              cell.day &&
              today.getDate() === cell.day &&
              today.getMonth() === month &&
              today.getFullYear() === year;
            return (
              <View
                key={colIdx}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cell.day ? (
                  <View
                    style={{
                      width: getCircleSize(count),
                      height: getCircleSize(count),
                      borderRadius: getCircleSize(count) / 2,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: getDayColor(count),
                      borderWidth: isToday ? 2.5 : 1.5,
                      borderColor: isToday
                        ? isDarkMode
                          ? "#38bdf8"
                          : "#0ea5e9"
                        : getBorderColor(count),
                      shadowColor: isToday
                        ? isDarkMode
                          ? "#38bdf8"
                          : "#0ea5e9"
                        : undefined,
                      shadowOpacity: isToday ? 0.5 : 0,
                      shadowRadius: isToday ? 6 : 0,
                      elevation: isToday ? 4 : 0,
                    }}
                  >
                    <Text
                      style={{
                        color: getTextColor(count),
                        fontSize: 14,
                        fontWeight: "bold",
                      }}
                    >
                      {cell.day}
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: 22, height: 22 }} />
                )}
              </View>
            );
          })}
        </View>
      ))}
      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          marginTop: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: isDarkMode ? "#22d3ee" : "#059669",
            marginRight: 4,
            borderWidth: 1,
            borderColor: isDarkMode ? "#22d3ee" : "#059669",
          }}
        />
        <Text
          style={{
            color: isDarkMode ? "#22d3ee" : "#059669",
            fontSize: 12,
            marginRight: 10,
          }}
        >
          4+ completed
        </Text>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: isDarkMode ? "#fbbf24" : "#f59e42",
            marginRight: 4,
            borderWidth: 1,
            borderColor: isDarkMode ? "#fbbf24" : "#f59e42",
          }}
        />
        <Text
          style={{
            color: isDarkMode ? "#fbbf24" : "#f59e42",
            fontSize: 12,
            marginRight: 10,
          }}
        >
          2-3 completed
        </Text>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: isDarkMode ? "#a3e635" : "#84cc16",
            marginRight: 4,
            borderWidth: 1,
            borderColor: isDarkMode ? "#a3e635" : "#84cc16",
          }}
        />
        <Text
          style={{
            color: isDarkMode ? "#a3e635" : "#84cc16",
            fontSize: 12,
            marginRight: 10,
          }}
        >
          1 completed
        </Text>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: isDarkMode ? "#334155" : "#e5e7eb",
            marginRight: 4,
            borderWidth: 1,
            borderColor: isDarkMode ? "#64748b" : "#cbd5e1",
          }}
        />
        <Text
          style={{
            color: isDarkMode ? "#64748b" : "#64748b",
            fontSize: 12,
          }}
        >
          0 completed
        </Text>
      </View>
    </View>
  );
}
