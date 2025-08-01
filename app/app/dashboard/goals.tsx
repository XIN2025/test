import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  Target,
  Plus,
  Edit3,
  CheckCircle,
  Circle,
  Calendar,
  TrendingUp,
  BookOpen,
  Star,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  AlertCircle,
} from "lucide-react-native";
import Card from "@/components/ui/card";
import WeeklyGoalsSummary from "@/components/WeeklyGoalsSummary";
import GoalProgressTracker from "@/components/GoalProgressTracker";
import WeeklyReflection from "@/components/WeeklyReflection";
import HabitGoalIntegration from "@/components/HabitGoalIntegration";
import { useGoals } from "@/hooks/useGoals";
import { Goal, GoalPriority, GoalCategory } from "@/types/goals";
// @ts-ignore
import { tw } from "nativewind";

// Mock user email - replace with actual user authentication
const MOCK_USER_EMAIL = "user@example.com";

export default function GoalsScreen() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [showReflection, setShowReflection] = useState(false);

  // Use the goals hook for backend integration
  const {
    goals,
    loading,
    error,
    stats,
    createGoal,
    updateGoal,
    deleteGoal,
    updateGoalProgress,
    addGoalNote,
    saveWeeklyReflection,
    loadGoals,
  } = useGoals({ userEmail: MOCK_USER_EMAIL });

  // Form state for adding/editing goals
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as GoalPriority,
    category: "health" as GoalCategory,
    targetValue: "",
    unit: "",
    dueDate: new Date(),
  });

  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { start, end };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "health":
        return "❤️";
      case "fitness":
        return "💪";
      case "nutrition":
        return "🥗";
      case "mental":
        return "🧠";
      case "personal":
        return "⭐";
      default:
        return "🎯";
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.target_value || !goal.current_value) return 0;
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  const handleAddGoal = async () => {
    if (!formData.title.trim()) {
      Alert.alert("Error", "Please enter a goal title");
      return;
    }

    try {
      await createGoal({
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        category: formData.category,
        target_value: formData.targetValue
          ? parseFloat(formData.targetValue)
          : undefined,
        unit: formData.unit,
        due_date: formData.dueDate.toISOString(),
      });

      setShowAddGoal(false);
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        category: "health",
        targetValue: "",
        unit: "",
        dueDate: new Date(),
      });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create goal"
      );
    }
  };

  const handleUpdateProgress = async (goalId: string, newValue: number) => {
    try {
      await updateGoalProgress(goalId, newValue);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update progress"
      );
    }
  };

  const handleToggleComplete = async (goalId: string) => {
    try {
      const goal = goals.find((g) => g.id === goalId);
      if (!goal) return;

      await updateGoal(goalId, { completed: !goal.completed });
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update goal"
      );
    }
  };

  const handleAddNote = async (goalId: string, note: string) => {
    if (!note.trim()) return;

    try {
      await addGoalNote(goalId, note);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add note"
      );
    }
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeek);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentWeek(newDate);

    // Load goals for the new week
    const { start } = getWeekDates(newDate);
    loadGoals(start.toISOString());
  };

  const handleSaveReflection = async (
    reflection: string,
    rating: number,
    nextWeekGoals: string[]
  ) => {
    try {
      const { start, end } = getWeekDates(currentWeek);
      await saveWeeklyReflection({
        week_start: start.toISOString(),
        week_end: end.toISOString(),
        rating,
        reflection,
        next_week_goals: nextWeekGoals,
      });
      setShowReflection(false);
      Alert.alert("Success", "Weekly reflection saved successfully");
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save reflection"
      );
    }
  };

  const { start: weekStart, end: weekEnd } = getWeekDates(currentWeek);
  const completedGoals = goals.filter((goal) => goal.completed).length;
  const totalGoals = goals.length;
  const completionRate =
    totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  if (loading && goals.length === 0) {
    return (
      <SafeAreaView className="flex-1">
        <LinearGradient
          colors={["#ecfdf5", "#f0fdfa"]}
          className="flex-1"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#059669" />
            <Text className="text-gray-600 mt-4">Loading goals...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#ecfdf5", "#f0fdfa"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
                <Target size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">
                  Weekly Goals
                </Text>
                <Text className="text-sm text-gray-600">
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddGoal(true)}
              className="w-8 h-8 bg-emerald-600 rounded-full items-center justify-center"
            >
              <Plus size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View className="bg-red-50 border border-red-200 mx-4 mt-4 p-3 rounded-lg">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <View className="px-4 space-y-6 mt-4">
            {/* Week Navigation */}
            <Card className="border-0">
              <View className="flex-row items-center justify-between p-4">
                <TouchableOpacity
                  onPress={() => handleWeekChange("prev")}
                  className="p-2"
                >
                  <ChevronLeft size={20} color="#059669" />
                </TouchableOpacity>
                <View className="items-center">
                  <Text className="font-semibold text-gray-800">
                    Week of {formatDate(weekStart)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {completedGoals}/{totalGoals} goals completed
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleWeekChange("next")}
                  className="p-2"
                >
                  <ChevronRight size={20} color="#059669" />
                </TouchableOpacity>
              </View>
            </Card>

            {/* Progress Overview */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <BarChart3 size={20} color="#059669" className="mr-2" />
                  <Text className="text-lg font-semibold text-gray-800">
                    Weekly Progress
                  </Text>
                </View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm text-gray-600">Completion Rate</Text>
                  <Text className="text-sm font-semibold text-gray-800">
                    {completionRate.toFixed(0)}%
                  </Text>
                </View>
                <View className="h-3 bg-gray-200 rounded-full">
                  <View
                    className="h-3 bg-emerald-500 rounded-full"
                    style={{ width: `${completionRate}%` }}
                  />
                </View>
                <View className="flex-row justify-between mt-3">
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-emerald-600">
                      {completedGoals}
                    </Text>
                    <Text className="text-xs text-gray-600">Completed</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-gray-400">
                      {totalGoals - completedGoals}
                    </Text>
                    <Text className="text-xs text-gray-600">Remaining</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-blue-600">
                      {totalGoals}
                    </Text>
                    <Text className="text-xs text-gray-600">Total</Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Goals Summary */}
            <WeeklyGoalsSummary
              goals={goals.map((goal) => ({
                id: goal.id,
                title: goal.title,
                currentValue: goal.current_value || 0,
                targetValue: goal.target_value || 1,
                completed: goal.completed,
                category: goal.category,
              }))}
              onViewAll={() => {
                // Scroll to goals list or show all goals
                console.log("View all goals");
              }}
            />

            {/* Goals List */}
            {goals.map((goal) => (
              <Card key={goal.id} className="border-0">
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="text-lg mr-2">
                          {getCategoryIcon(goal.category)}
                        </Text>
                        <Text className="text-lg font-semibold text-gray-800 flex-1">
                          {goal.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setEditingGoal(goal)}
                          className="p-1"
                        >
                          <Edit3 size={16} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-sm text-gray-600 mb-2">
                        {goal.description}
                      </Text>
                      <View className="flex-row items-center mb-2">
                        <Text
                          className={`text-xs font-medium ${getPriorityColor(
                            goal.priority
                          )}`}
                        >
                          {goal.priority.toUpperCase()} PRIORITY
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleComplete(goal.id)}
                      className="ml-2"
                    >
                      {goal.completed ? (
                        <CheckCircle size={24} color="#059669" />
                      ) : (
                        <Circle size={24} color="#d1d5db" />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Use GoalProgressTracker component for measurable goals */}
                  {goal.target_value && (
                    <GoalProgressTracker
                      goalId={goal.id}
                      title=""
                      currentValue={goal.current_value || 0}
                      targetValue={goal.target_value}
                      unit={goal.unit || ""}
                      onProgressUpdate={handleUpdateProgress}
                      showQuickActions={true}
                    />
                  )}

                  {/* Notes */}
                  {goal.notes.length > 0 && (
                    <View className="mt-2">
                      <Text className="text-xs font-medium text-gray-700 mb-1">
                        Notes:
                      </Text>
                      {goal.notes.map((note, index) => (
                        <Text
                          key={index}
                          className="text-xs text-gray-600 mb-1"
                        >
                          • {note}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Add Note */}
                  <View className="flex-row items-center mt-2">
                    <TextInput
                      placeholder="Add a note..."
                      className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 mr-2"
                      onSubmitEditing={(e) => {
                        handleAddNote(goal.id, e.nativeEvent.text);
                        e.currentTarget.setNativeProps({ text: "" });
                      }}
                    />
                  </View>
                </View>
              </Card>
            ))}

            {/* Weekend Reflection */}
            {new Date().getDay() === 0 && ( // Sunday
              <Card className="border-0 bg-blue-50">
                <View className="p-4">
                  <View className="flex-row items-center mb-3">
                    <BookOpen size={20} color="#3b82f6" className="mr-2" />
                    <Text className="text-lg font-semibold text-blue-800">
                      Weekly Reflection
                    </Text>
                  </View>
                  <Text className="text-sm text-blue-700 mb-3">
                    Take a moment to reflect on your week and plan for the next
                    one.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowReflection(true)}
                    className="bg-blue-600 px-4 py-2 rounded-lg self-start"
                  >
                    <Text className="text-white font-medium">
                      Start Reflection
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            )}

            {/* Habit Integration */}
            {goals.length > 0 && (
              <HabitGoalIntegration
                goalId={goals[0].id}
                goalTitle={goals[0].title}
                suggestedHabits={[
                  "Set a daily reminder",
                  "Track progress in the morning",
                  "Review goals before bed",
                  "Celebrate small wins",
                ]}
                completedHabits={["Set a daily reminder"]}
                onHabitToggle={(habit) => {
                  // Handle habit toggle
                  console.log("Habit toggled:", habit);
                }}
              />
            )}

            {/* Quick Actions */}
            <Card className="border-0">
              <View className="p-4">
                <Text className="text-lg font-semibold text-gray-800 mb-3">
                  Quick Actions
                </Text>
                <View className="space-y-2">
                  <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                    <Calendar size={20} color="#059669" className="mr-3" />
                    <Text className="flex-1 text-gray-800">
                      View Monthly Overview
                    </Text>
                    <ArrowRight size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                    <TrendingUp size={20} color="#059669" className="mr-3" />
                    <Text className="flex-1 text-gray-800">
                      Progress Analytics
                    </Text>
                    <ArrowRight size={16} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                    <Star size={20} color="#059669" className="mr-3" />
                    <Text className="flex-1 text-gray-800">
                      Achievement Badges
                    </Text>
                    <ArrowRight size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </View>
        </ScrollView>

        {/* Add Goal Modal */}
        {showAddGoal && (
          <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
            <View className="bg-white rounded-lg p-6 m-4 w-full max-w-sm">
              <Text className="text-xl font-semibold text-gray-800 mb-4">
                Add New Goal
              </Text>

              <TextInput
                placeholder="Goal title"
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
              />

              <TextInput
                placeholder="Description (optional)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 mb-3"
                multiline
              />

              <View className="flex-row justify-between mb-3">
                <Text className="text-sm font-medium text-gray-700">
                  Priority:
                </Text>
                <View className="flex-row">
                  {(["low", "medium", "high"] as const).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      onPress={() => setFormData({ ...formData, priority })}
                      className={`px-3 py-1 rounded mr-1 ${
                        formData.priority === priority
                          ? "bg-emerald-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          formData.priority === priority
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {priority.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row justify-between mb-3">
                <Text className="text-sm font-medium text-gray-700">
                  Category:
                </Text>
                <View className="flex-row">
                  {(
                    [
                      "health",
                      "fitness",
                      "nutrition",
                      "mental",
                      "personal",
                    ] as const
                  ).map((category) => (
                    <TouchableOpacity
                      key={category}
                      onPress={() => setFormData({ ...formData, category })}
                      className={`px-2 py-1 rounded mr-1 ${
                        formData.category === category
                          ? "bg-emerald-600"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs ${
                          formData.category === category
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="flex-row mb-3">
                <TextInput
                  placeholder="Target value"
                  value={formData.targetValue}
                  onChangeText={(text) =>
                    setFormData({ ...formData, targetValue: text })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 flex-1 mr-2"
                  keyboardType="numeric"
                />
                <TextInput
                  placeholder="Unit"
                  value={formData.unit}
                  onChangeText={(text) =>
                    setFormData({ ...formData, unit: text })
                  }
                  className="border border-gray-300 rounded-lg px-3 py-2 flex-1"
                />
              </View>

              <View className="flex-row">
                <TouchableOpacity
                  onPress={() => setShowAddGoal(false)}
                  className="flex-1 bg-gray-300 px-4 py-2 rounded-lg mr-2"
                >
                  <Text className="text-center text-gray-700">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddGoal}
                  className="flex-1 bg-emerald-600 px-4 py-2 rounded-lg ml-2"
                >
                  <Text className="text-center text-white">Add Goal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Reflection Modal */}
        {showReflection && (
          <WeeklyReflection
            weekStart={weekStart}
            weekEnd={weekEnd}
            completedGoals={completedGoals}
            totalGoals={totalGoals}
            onSave={handleSaveReflection}
            onClose={() => setShowReflection(false)}
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}
