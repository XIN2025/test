import { CircularProgressRing } from "@/components/CircularProgressRing";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useActionCompletions } from "@/hooks/useActionCompletions";
import { useGoals } from "@/hooks/useGoals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Bell, Calendar, Flame, Heart, MessageCircle, Settings, Target } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Tooltip from "react-native-walkthrough-tooltip";
import { goalsApi } from "../../services/goalsApi";

const { width } = Dimensions.get("window");

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
            <View style={{ marginRight: 8 }}>
              <Flame
                size={22}
                color={unlocked ? (isDarkMode ? "#fbbf24" : "#f59e42") : isDarkMode ? "#64748b" : "#cbd5e1"}
              />
            </View>
            <Text
              style={{
                color: unlocked ? (isDarkMode ? "#fbbf24" : "#f59e42") : isDarkMode ? "#64748b" : "#64748b",
                fontWeight: unlocked ? "bold" : "normal",
                fontSize: 15,
              }}
            >
              {m.label}
            </Text>
            <Text
              style={{
                color: unlocked ? (isDarkMode ? "#22c55e" : "#059669") : isDarkMode ? "#64748b" : "#64748b",
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
  const { user } = useAuth();
  const userEmail = user?.email || "";
  const userName = user?.name || "";

  // Debug logging for walkthrough
  console.log("🏠 MainDashboard loaded for user:", userEmail?.substring(0, 10) + "...");
  // --- Daily Completion for Streak Calendar ---
  const [dailyCompletion, setDailyCompletion] = useState<Record<string, number>>({});
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
  const [streakTab, setStreakTab] = useState<"calendar" | "achievements">("calendar");
  const fetchStreak = useCallback(async () => {
    if (!userEmail) return;
    setStreakLoading(true);
    setStreakError(null);
    try {
      const stats = await goalsApi.getGoalStats(userEmail, 12);
      setStreak(stats?.weekly_streak ?? 0);
    } catch {
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
  const { completionStats, getGoalCompletionPercentage, markCompletion, loadCompletionStats } =
    useActionCompletions(userEmail);
  // Walkthrough state management
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [showAllTodayItems, setShowAllTodayItems] = useState(false);
  const [recentInteractions, setRecentInteractions] = useState<Map<string, number>>(new Map());

  // Walkthrough steps configuration
  const walkthroughSteps = [
    {
      content:
        "💬 Chat with EVRA - Get instant health guidance from your AI assistant. Ask questions about nutrition, exercise, medications, and more!",
      placement: "bottom" as const,
    },
    {
      content:
        "📊 Health Score - Your overall health score is calculated based on your daily activities, goal completion, and health metrics. Higher scores mean better health habits!",
      placement: "bottom" as const,
    },
    {
      content:
        "✅ Today's Action Items - Complete your daily health tasks to stay on track with your goals. Tap the checkboxes to mark items as done and build your streak!",
      placement: "top" as const,
    },
    {
      content:
        "🎯 Weekly Goals - Monitor your progress towards weekly health goals and stay motivated. Track completion percentages and see how you're doing each week!",
      placement: "top" as const,
    },
  ];

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

  // Removed local demo tasks; weekly goals are now sourced from API via useGoals

  // Determine the key for today's day name used in schedules
  const dayKey = useMemo(() => {
    const day = new Date().getDay(); // 0=Sun..6=Sat
    return ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day] || "monday";
  }, []);

  // Per-user storage key for walkthrough completion
  const walkthroughStorageKey = useMemo(() => `dashboardWalkthroughSeen:${userEmail || "guest"}`, [userEmail]);

  // Check if walkthrough should be shown
  useEffect(() => {
    const checkWalkthrough = async () => {
      try {
        if (!userEmail) {
          console.log("❌ No user email, skipping walkthrough check");
          return;
        }

        console.log("🔍 Checking walkthrough conditions for:", userEmail);

        // Check if we should show walkthrough from AsyncStorage
        const walkthroughTrigger = await AsyncStorage.getItem(`showWalkthrough:${userEmail}`);
        console.log("📱 Walkthrough trigger from storage:", walkthroughTrigger);

        // Only show walkthrough if coming from register flow
        const shouldShowWalkthrough = walkthroughTrigger === "register";
        console.log("🎯 Should show walkthrough (register only):", shouldShowWalkthrough);

        if (!shouldShowWalkthrough) {
          console.log("❌ Not showing walkthrough - not from register flow");
          return;
        }

        // Clear the trigger so it only shows once
        await AsyncStorage.removeItem(`showWalkthrough:${userEmail}`);

        const seen = await AsyncStorage.getItem(walkthroughStorageKey);
        console.log("💾 Walkthrough seen before:", !!seen, "Storage key:", walkthroughStorageKey);

        if (!seen) {
          console.log("🚀 Starting walkthrough");
          setShowWalkthrough(true);
          setWalkthroughStep(0);
        } else {
          console.log("❌ Walkthrough already seen before");
        }
      } catch (error) {
        console.log("❌ Error checking walkthrough status:", error);
      }
    };

    checkWalkthrough();
  }, [walkthroughStorageKey, userEmail]);

  // Handle walkthrough navigation
  const handleNext = () => {
    if (walkthroughStep < walkthroughSteps.length - 1) {
      setWalkthroughStep(walkthroughStep + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (walkthroughStep > 0) {
      setWalkthroughStep(walkthroughStep - 1);
    }
  };

  const handleFinish = async () => {
    console.log("✅ Walkthrough completed");
    setShowWalkthrough(false);
    try {
      await AsyncStorage.setItem(walkthroughStorageKey, "true");
      console.log("💾 Walkthrough completion saved to storage");
    } catch (error) {
      console.log("❌ Error saving walkthrough completion:", error);
    }
  };

  const handleSkip = () => {
    console.log("⏭️ Walkthrough skipped");
    handleFinish();
  };

  // Helper function to render tooltip content
  const renderTooltipContent = (stepIndex: number) => {
    const step = walkthroughSteps[stepIndex];
    const isFirst = stepIndex === 0;
    const isLast = stepIndex === walkthroughSteps.length - 1;

    // Parse content to get title and description
    const parts = step.content.split(" - ");
    const title = parts[0] || "Welcome to EVRA";
    const description = parts[1] || step.content;

    return (
      <View style={{ padding: 20, minWidth: 320, maxWidth: 360 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 12, color: "#fff" }}>{title}</Text>
        <Text style={{ fontSize: 15, color: "#e5e7eb", marginBottom: 20, lineHeight: 22 }}>{description}</Text>

        {/* Progress bar */}
        <View style={{ marginBottom: 20 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}
          >
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>Progress</Text>
            <Text style={{ color: "#9ca3af", fontSize: 12 }}>
              {stepIndex + 1} of {walkthroughSteps.length}
            </Text>
          </View>
          <View style={{ height: 4, backgroundColor: "#374151", borderRadius: 2 }}>
            <View
              style={{
                height: 4,
                backgroundColor: "#059669",
                borderRadius: 2,
                width: `${((stepIndex + 1) / walkthroughSteps.length) * 100}%`,
              }}
            />
          </View>
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={isFirst ? handleSkip : handlePrevious}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#6b7280",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#d1d5db", fontSize: 16, fontWeight: "600" }}>{isFirst ? "Skip" : "Previous"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={{
              flex: 1,
              backgroundColor: "#059669",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              shadowColor: "#059669",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{isLast ? "Finish" : "Next"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Note: We now use AsyncStorage for walkthrough triggers instead of URL parameters
  // This avoids issues with tab navigation clearing parameters

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

    const makeKey = (title: string, goalTitle: string | undefined, start?: string, end?: string) => {
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
    items.sort((a, b) => formatTimeHM(a.start_time).localeCompare(formatTimeHM(b.start_time)));
    return items;
  }, [goals, dayKey]);

  // Helper to check if an action item is completed for the current week
  const isActionItemCompletedThisWeek = useCallback((actionItem: any): boolean => {
    if (!actionItem?.weekly_completion) {
      return false;
    }

    // Get the start of the current week (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Check if there's a completion entry for this week
    const isComplete = actionItem.weekly_completion.some((completion: any) => {
      const completionWeekStart = new Date(completion.week_start);
      const matches = completionWeekStart.toDateString() === weekStart.toDateString();
      return matches && completion.is_complete;
    });

    return isComplete;
  }, []);

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
          const actionItem = goal.action_plan.action_items.find((ai: any) => ai.title === item.title);
          if (actionItem) {
            isCompletedByWeeklyStatus = isActionItemCompletedThisWeek(actionItem);
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
        const shouldBeCompleted = isCompletedByWeeklyStatus || isCompletedByDailyStats;
        const isCurrentlyCompleted = completedItems.has(item.id);

        // Only update if the state actually changed
        if (shouldBeCompleted && !isCurrentlyCompleted) {
          newCompletedItems.add(item.id);
        } else if (!shouldBeCompleted && isCurrentlyCompleted) {
          newCompletedItems.delete(item.id);
        }
      });

      // Only update state if there were actual changes
      if (
        newCompletedItems.size !== completedItems.size ||
        [...newCompletedItems].some((id) => !completedItems.has(id))
      ) {
        setCompletedItems(newCompletedItems);
      }
    }, 100); // 100ms delay

    return () => clearTimeout(timeoutId);
  }, [completionStats, todaysItems, recentInteractions, goals, isActionItemCompletedThisWeek, completedItems]);

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

  return (
    <SafeAreaView>
      <View>
        {/* Fixed Header */}
        <View
          className={`shadow-sm px-4 py-4 z-10 ${isDarkMode ? "bg-gray-900 border-b border-gray-800" : "bg-white"}`}
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
                <Text className={`font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                  {`Good morning, ${userName || "User"}!`}
                </Text>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                  Ready for a healthy day?
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-3">
              <Pressable onPress={openStreakModal} accessibilityLabel="Show Streak">
                <Flame size={22} color={isDarkMode ? "#fbbf24" : "#f59e42"} />
              </Pressable>
              <Pressable accessibilityLabel="Notifications">
                <Bell size={20} color={isDarkMode ? "#9ca3af" : "#64748b"} />
              </Pressable>
              <Pressable accessibilityLabel="Settings">
                <Settings size={20} color={isDarkMode ? "#9ca3af" : "#64748b"} />
              </Pressable>
            </View>
            {/* Streak Modal */}
            <Modal visible={showStreakModal} animationType="slide" transparent onRequestClose={closeStreakModal}>
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
                          streakTab === "calendar" ? (isDarkMode ? "#fbbf24" : "#f59e42") : "transparent",
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
                          streakTab === "achievements" ? (isDarkMode ? "#fbbf24" : "#f59e42") : "transparent",
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
                      <Flame size={40} color={isDarkMode ? "#fbbf24" : "#f59e42"} />
                      <Text
                        style={{
                          fontSize: 22,
                          fontWeight: "bold",
                          marginTop: 12,
                          color: isDarkMode ? "#fbbf24" : "#f59e42",
                        }}
                      >
                        {streakLoading ? "Loading..." : streakError ? streakError : `🔥 ${streak ?? 0} week streak!`}
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
                        <StreakCalendar isDarkMode={isDarkMode} dailyCompletion={dailyCompletion} />
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
        <ScrollView
          style={{ height: "100%", backgroundColor: isDarkMode ? "#111827" : "#F0FDF4" }}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {/* Health Score and Quick Actions Row */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 24,
                minHeight: width * 0.4, // Ensure consistent height
              }}
            >
              {/* Quick Actions - Left Side */}
              <View style={{ width: "48%", paddingRight: 8 }}>
                <Tooltip
                  isVisible={showWalkthrough && walkthroughStep === 0}
                  content={renderTooltipContent(0)}
                  placement="bottom"
                  onClose={handleSkip}
                  backgroundColor="rgba(0,0,0,0.9)"
                  showChildInTooltip={true}
                  allowChildInteraction={false}
                  closeOnChildInteraction={false}
                  closeOnContentInteraction={false}
                  childContentSpacing={12}
                  displayInsets={{ top: 50, bottom: 50, left: 20, right: 20 }}
                  useReactNativeModal={true}
                  childrenWrapperStyle={{
                    backgroundColor: "transparent",
                  }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: "#059669",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 16,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => router.push("./chat")}
                    style={{
                      marginBottom: 12,
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      borderRadius: 16,
                      padding: 16,
                      alignItems: "center",
                      minHeight: width * 0.18,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: isDarkMode ? 0.3 : 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ marginBottom: 8 }}>
                      <MessageCircle size={28} color={isDarkMode ? "#34d399" : "#114131"} />
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                        textAlign: "center",
                      }}
                    >
                      Chat with EVRA
                    </Text>
                  </TouchableOpacity>
                </Tooltip>

                <TouchableOpacity
                  style={{
                    backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                    borderRadius: 16,
                    padding: 16,
                    alignItems: "center",
                    minHeight: width * 0.18,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isDarkMode ? 0.3 : 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ marginBottom: 8 }}>
                    <Calendar size={28} color={isDarkMode ? "#34d399" : "#114131"} />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      textAlign: "center",
                    }}
                  >
                    Book Appointment
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Health Score - Right Side */}
              <View className="items-center justify-center">
                <Tooltip
                  isVisible={showWalkthrough && walkthroughStep === 1}
                  content={renderTooltipContent(1)}
                  placement="bottom"
                  onClose={handleSkip}
                  backgroundColor="rgba(0,0,0,0.9)"
                  showChildInTooltip={true}
                  allowChildInteraction={false}
                  closeOnChildInteraction={false}
                  closeOnContentInteraction={false}
                  childContentSpacing={16}
                  displayInsets={{ top: 50, bottom: 50, left: 20, right: 20 }}
                  useReactNativeModal={true}
                  childrenWrapperStyle={{
                    backgroundColor: "transparent",
                  }}
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: "#059669",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 16,
                    elevation: 16,
                  }}
                >
                  <View
                    style={{
                      width: width * 0.35, // Responsive width
                      height: width * 0.35, // Responsive height
                      borderRadius: width * 0.175,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#fed7aa",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <View
                      style={{
                        width: width * 0.28,
                        height: width * 0.28,
                        borderRadius: width * 0.14,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#f97316",
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 12, fontWeight: "500" }}>Health Score</Text>
                      <Text style={{ color: "white", fontSize: 28, fontWeight: "bold" }}>84</Text>
                    </View>
                  </View>
                </Tooltip>
              </View>
            </View>

            {/* Today's Action Items (collapsible) */}
            <Tooltip
              isVisible={showWalkthrough && walkthroughStep === 2}
              content={renderTooltipContent(2)}
              placement="top"
              onClose={handleSkip}
              backgroundColor="rgba(0,0,0,0.9)"
              showChildInTooltip={true}
              allowChildInteraction={false}
              closeOnChildInteraction={false}
              closeOnContentInteraction={false}
              childContentSpacing={12}
              displayInsets={{ top: 50, bottom: 50, left: 20, right: 20 }}
              useReactNativeModal={true}
              childrenWrapperStyle={{
                backgroundColor: "transparent",
              }}
              contentStyle={{
                backgroundColor: "#1f2937",
                borderRadius: 16,
                borderWidth: 2,
                borderColor: "#059669",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                  width: "100%",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                  >
                    Today&apos;s Action Items
                  </Text>
                </View>
                {todaysItems.length === 0 ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                    }}
                  >
                    No scheduled items for today.
                  </Text>
                ) : (
                  (showAllTodayItems ? todaysItems : todaysItems.slice(0, 3)).map((it) => (
                    <View
                      key={it.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 16,
                        paddingVertical: 4,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <TouchableOpacity
                          onPress={() => toggleItemCompleted(it.id)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            borderWidth: 2,
                            borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                            marginRight: 12,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: completedItems.has(it.id)
                              ? isDarkMode
                                ? "#10b981"
                                : "#059669"
                              : "transparent",
                          }}
                          activeOpacity={0.7}
                        >
                          {completedItems.has(it.id) && (
                            <Text style={{ color: "white", fontSize: 16, fontWeight: "bold" }}>✓</Text>
                          )}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "500",
                              color: completedItems.has(it.id)
                                ? isDarkMode
                                  ? "#6b7280"
                                  : "#6b7280"
                                : isDarkMode
                                ? "#f3f4f6"
                                : "#1f2937",
                              textDecorationLine: completedItems.has(it.id) ? "line-through" : "none",
                            }}
                          >
                            {it.title}
                          </Text>
                          {it.goalTitle && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: isDarkMode ? "#9ca3af" : "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              {it.goalTitle}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end", marginLeft: 12 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "500",
                            color: isDarkMode ? "#9ca3af" : "#6b7280",
                          }}
                        >
                          {it.start_time && it.end_time
                            ? `${formatTimeHM(it.start_time)} - ${formatTimeHM(it.end_time)}`
                            : formatTimeHM(it.start_time) || formatTimeHM(it.end_time) || ""}
                        </Text>
                      </View>
                    </View>
                  ))
                )}

                {todaysItems.length > 3 && (
                  <TouchableOpacity
                    onPress={() => setShowAllTodayItems((v) => !v)}
                    style={{
                      marginTop: 8,
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isDarkMode ? "#34d399" : "#114131",
                      }}
                    >
                      {showAllTodayItems ? "Show less" : `Show all (${todaysItems.length})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Tooltip>

            {/* Removed Today's Tasks card */}

            {/* Weekly Goals Summary (from goals endpoint) */}
            <Tooltip
              key={`weekly-goals-tooltip-${showWalkthrough && walkthroughStep === 3}`}
              isVisible={showWalkthrough && walkthroughStep === 3}
              content={renderTooltipContent(3)}
              placement="top"
              onClose={handleSkip}
              backgroundColor="rgba(0,0,0,0.95)"
              showChildInTooltip={true}
              allowChildInteraction={false}
              closeOnChildInteraction={false}
              closeOnContentInteraction={false}
              childContentSpacing={16}
              displayInsets={{ top: 50, bottom: 50, left: 20, right: 20 }}
              useReactNativeModal={true}
              childrenWrapperStyle={{
                backgroundColor: "transparent",
                opacity: 1,
                flex: 1,
              }}
              contentStyle={{
                backgroundColor: "#1f2937",
                borderRadius: 16,
                borderWidth: 2,
                borderColor: "#059669",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.5,
                shadowRadius: 16,
                elevation: 16,
                maxWidth: 360,
              }}
            >
              <View
                style={{
                  backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDarkMode ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ marginRight: 8 }}>
                      <Target size={20} color={isDarkMode ? "#34d399" : "#114131"} />
                    </View>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      }}
                    >
                      Weekly Goals
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: isDarkMode ? "#34d399" : "#114131",
                      }}
                    >
                      {`${(goals || []).filter((g: any) => g.completed).length}/${(goals || []).length}`}
                    </Text>
                  </View>
                </View>
                {(goals || []).length === 0 ? (
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                    }}
                  >
                    No goals yet.
                  </Text>
                ) : (
                  <View>
                    {(goals as any[]).slice(0, 5).map((g: any) => {
                      const completionPercentage = getGoalCompletionPercentage(g.id);
                      return (
                        <View
                          key={g.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 16,
                            paddingVertical: 4,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            {/* Circular Progress Ring */}
                            <View style={{ marginRight: 12 }}>
                              <CircularProgressRing
                                size={44}
                                strokeWidth={3}
                                progress={completionPercentage}
                                color={
                                  completionPercentage >= 80
                                    ? "#10b981" // Green for high completion
                                    : completionPercentage >= 50
                                    ? "#f59e0b" // Yellow for medium completion
                                    : "#ef4444" // Red for low completion
                                }
                                backgroundColor={isDarkMode ? "#374151" : "#e5e7eb"}
                                showPercentage={false}
                                textColor={isDarkMode ? "#d1d5db" : "#374151"}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "500",
                                  color: isDarkMode ? "#e5e7eb" : "#1f2937",
                                  marginBottom: 2,
                                }}
                              >
                                {g.title}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                                }}
                              >
                                {completionPercentage.toFixed(0)}% completed this week
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <View
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: 6,
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
                              style={{
                                fontSize: 11,
                                marginTop: 4,
                                color: isDarkMode ? "#9ca3af" : "#6b7280",
                              }}
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
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isDarkMode ? "#064e3b" : "#e6f4f1",
                  }}
                  onPress={() => router.push("./goals")}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: "600",
                      color: isDarkMode ? "#34d399" : "#114131",
                    }}
                  >
                    View All Goals
                  </Text>
                </TouchableOpacity>
              </View>
            </Tooltip>
          </View>
        </ScrollView>
      </View>
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

export function StreakCalendar({ isDarkMode, dailyCompletion }: StreakCalendarProps) {
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
              cell.day && today.getDate() === cell.day && today.getMonth() === month && today.getFullYear() === year;
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
                      borderColor: isToday ? (isDarkMode ? "#38bdf8" : "#0ea5e9") : getBorderColor(count),
                      shadowColor: isToday ? (isDarkMode ? "#38bdf8" : "#0ea5e9") : undefined,
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
