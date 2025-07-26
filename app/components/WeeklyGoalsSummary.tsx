import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
// @ts-ignore
import { Target } from "lucide-react-native";
import Card from "@/components/ui/card";

interface Goal {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  completed: boolean;
  category: string;
}

interface WeeklyGoalsSummaryProps {
  goals: Goal[];
  onViewAll?: () => void;
}

export default function WeeklyGoalsSummary({
  goals,
  onViewAll,
}: WeeklyGoalsSummaryProps) {
  const completedGoals = goals.filter((goal) => goal.completed).length;
  const totalGoals = goals.length;

  return (
    <Card className="border-0">
      <View className="p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Target size={20} color="#059669" className="mr-2" />
            <Text className="text-lg font-semibold text-gray-800">
              Weekly Goals
            </Text>
          </View>
          <View className="bg-emerald-100 px-3 py-1 rounded-full">
            <Text className="text-xs text-emerald-700 font-medium">
              {completedGoals}/{totalGoals}
            </Text>
          </View>
        </View>

        <View className="space-y-2">
          {goals.slice(0, 3).map((goal, index) => (
            <View
              key={goal.id}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-2 h-2 rounded-full mr-2 ${
                    goal.completed ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                />
                <Text className="text-sm text-gray-700 flex-1">
                  {goal.title}
                </Text>
              </View>
              <Text className="text-xs text-gray-500">
                {goal.currentValue}/{goal.targetValue}
              </Text>
            </View>
          ))}
        </View>

        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            className="mt-3 bg-emerald-50 p-2 rounded-lg"
          >
            <Text className="text-center text-sm text-emerald-700 font-medium">
              View All Goals
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );
}
