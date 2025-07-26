import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
// @ts-ignore
import {
  BookOpen,
  Star,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle,
} from "lucide-react-native";
import Card from "@/components/ui/card";

interface WeeklyReflectionProps {
  weekStart: Date;
  weekEnd: Date;
  completedGoals: number;
  totalGoals: number;
  onSave: (reflection: string, rating: number, nextWeekGoals: string[]) => void;
  onClose: () => void;
}

export default function WeeklyReflection({
  weekStart,
  weekEnd,
  completedGoals,
  totalGoals,
  onSave,
  onClose,
}: WeeklyReflectionProps) {
  const [reflection, setReflection] = useState("");
  const [rating, setRating] = useState(0);
  const [nextWeekGoals, setNextWeekGoals] = useState<string[]>([""]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleAddGoal = () => {
    setNextWeekGoals([...nextWeekGoals, ""]);
  };

  const handleUpdateGoal = (index: number, value: string) => {
    const updated = [...nextWeekGoals];
    updated[index] = value;
    setNextWeekGoals(updated);
  };

  const handleRemoveGoal = (index: number) => {
    if (nextWeekGoals.length > 1) {
      const updated = nextWeekGoals.filter((_, i) => i !== index);
      setNextWeekGoals(updated);
    }
  };

  const handleSave = () => {
    const filteredGoals = nextWeekGoals.filter((goal) => goal.trim() !== "");
    onSave(reflection, rating, filteredGoals);
  };

  const completionRate =
    totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center">
      <View className="bg-white rounded-lg m-4 w-full max-w-md max-h-[90%]">
        <ScrollView className="p-6">
          {/* Header */}
          <View className="flex-row items-center mb-4">
            <BookOpen size={24} color="#3b82f6" className="mr-2" />
            <Text className="text-xl font-semibold text-gray-800">
              Weekly Reflection
            </Text>
          </View>

          {/* Week Summary */}
          <Card className="border-0 bg-blue-50 mb-4">
            <View className="p-4">
              <Text className="text-sm font-medium text-blue-800 mb-2">
                Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
              </Text>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Target size={16} color="#3b82f6" className="mr-1" />
                  <Text className="text-sm text-blue-700">
                    {completedGoals}/{totalGoals} goals completed
                  </Text>
                </View>
                <Text className="text-sm font-semibold text-blue-800">
                  {completionRate.toFixed(0)}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Week Rating */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              How would you rate this week?
            </Text>
            <View className="flex-row justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  className="mx-1"
                >
                  <Star
                    size={24}
                    color={star <= rating ? "#fbbf24" : "#d1d5db"}
                    fill={star <= rating ? "#fbbf24" : "none"}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text className="text-xs text-gray-500 text-center mt-1">
              {rating === 0 && "Tap to rate"}
              {rating === 1 && "Very challenging"}
              {rating === 2 && "Somewhat difficult"}
              {rating === 3 && "Okay"}
              {rating === 4 && "Pretty good"}
              {rating === 5 && "Excellent!"}
            </Text>
          </View>

          {/* Reflection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              What went well this week?
            </Text>
            <TextInput
              placeholder="Share your thoughts on your achievements, challenges, and learnings..."
              value={reflection}
              onChangeText={setReflection}
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              textAlignVertical="top"
            />
          </View>

          {/* Next Week Goals */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Goals for next week
            </Text>
            {nextWeekGoals.map((goal, index) => (
              <View key={index} className="flex-row items-center mb-2">
                <TextInput
                  placeholder={`Goal ${index + 1}`}
                  value={goal}
                  onChangeText={(text) => handleUpdateGoal(index, text)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-2 text-sm"
                />
                {nextWeekGoals.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveGoal(index)}
                    className="w-8 h-8 bg-red-100 rounded-full items-center justify-center"
                  >
                    <Text className="text-red-600 text-sm">×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={handleAddGoal}
              className="bg-gray-100 px-3 py-2 rounded-lg self-start"
            >
              <Text className="text-sm text-gray-700">+ Add Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className="flex-row mt-4">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-300 px-4 py-2 rounded-lg mr-2"
            >
              <Text className="text-center text-gray-700 font-medium">
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className="flex-1 bg-blue-600 px-4 py-2 rounded-lg ml-2"
            >
              <Text className="text-center text-white font-medium">
                Save Reflection
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
