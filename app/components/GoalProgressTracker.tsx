import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
// @ts-ignore
import { TrendingUp, Plus, Minus, Target } from "lucide-react-native";

interface GoalProgressTrackerProps {
  goalId: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  onProgressUpdate: (goalId: string, newValue: number) => void;
  showQuickActions?: boolean;
}

export default function GoalProgressTracker({
  goalId,
  title,
  currentValue,
  targetValue,
  unit,
  onProgressUpdate,
  showQuickActions = true,
}: GoalProgressTrackerProps) {
  const [customValue, setCustomValue] = useState("");

  const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
  const isCompleted = currentValue >= targetValue;

  const handleQuickUpdate = (increment: number) => {
    const newValue = Math.max(0, currentValue + increment);
    onProgressUpdate(goalId, newValue);
  };

  const handleCustomUpdate = () => {
    const value = parseFloat(customValue);
    if (isNaN(value) || value < 0) {
      Alert.alert("Invalid Value", "Please enter a valid number");
      return;
    }
    onProgressUpdate(goalId, value);
    setCustomValue("");
  };

  return (
    <View className="bg-white rounded-lg p-4 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm font-medium text-gray-800 flex-1">
          {title}
        </Text>
        <View className="flex-row items-center">
          <Target
            size={16}
            color={isCompleted ? "#059669" : "#64748b"}
            className="mr-1"
          />
          <Text
            className={`text-sm font-semibold ${
              isCompleted ? "text-emerald-600" : "text-gray-700"
            }`}
          >
            {currentValue}/{targetValue} {unit}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="h-2 bg-gray-200 rounded-full mb-3">
        <View
          className={`h-2 rounded-full ${
            isCompleted ? "bg-emerald-500" : "bg-blue-500"
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </View>

      {/* Progress Percentage */}
      <Text className="text-xs text-gray-600 mb-3">
        {progressPercentage.toFixed(0)}% complete
      </Text>

      {/* Quick Actions */}
      {showQuickActions && (
        <View className="space-y-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-gray-600">Quick update:</Text>
            <View className="flex-row">
              <TouchableOpacity
                onPress={() => handleQuickUpdate(-1)}
                className="w-8 h-8 bg-red-100 rounded-full items-center justify-center mr-2"
              >
                <Minus size={14} color="#dc2626" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickUpdate(1)}
                className="w-8 h-8 bg-emerald-100 rounded-full items-center justify-center"
              >
                <Plus size={14} color="#059669" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Value Input */}
          <View className="flex-row items-center">
            <TextInput
              placeholder={`Enter ${unit}`}
              value={customValue}
              onChangeText={setCustomValue}
              keyboardType="numeric"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 mr-2 text-sm"
            />
            <TouchableOpacity
              onPress={handleCustomUpdate}
              className="bg-blue-600 px-3 py-2 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Completion Status */}
      {isCompleted && (
        <View className="mt-2 bg-emerald-50 p-2 rounded-lg">
          <Text className="text-xs text-emerald-700 text-center font-medium">
            🎉 Goal completed! Great job!
          </Text>
        </View>
      )}
    </View>
  );
}
