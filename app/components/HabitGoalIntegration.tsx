import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// @ts-ignore
import { Target, Calendar, TrendingUp, Lightbulb, CheckCircle } from 'lucide-react-native';
import Card from '@/components/ui/card';

interface HabitGoalIntegrationProps {
  goalId: string;
  goalTitle: string;
  suggestedHabits: string[];
  completedHabits: string[];
  onHabitToggle: (habit: string) => void;
}

export default function HabitGoalIntegration({
  goalId,
  goalTitle,
  suggestedHabits,
  completedHabits,
  onHabitToggle,
}: HabitGoalIntegrationProps) {
  return (
    <Card className='border-0 bg-gradient-to-r from-purple-50 to-blue-50'>
      <View className='p-4'>
        <View className='mb-3 flex-row items-center'>
          <Target size={20} color='#8b5cf6' className='mr-2' />
          <Text className='text-lg font-semibold text-gray-800'>Daily Habits for: {goalTitle}</Text>
        </View>

        <Text className='mb-3 text-sm text-gray-600'>
          Break down your weekly goal into daily habits for better success:
        </Text>

        <View className='space-y-2'>
          {suggestedHabits.map((habit, index) => {
            const isCompleted = completedHabits.includes(habit);
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onHabitToggle(habit)}
                className='flex-row items-center rounded-lg border border-gray-100 bg-white p-3'
              >
                <View
                  className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isCompleted ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
                  }`}
                >
                  {isCompleted && <CheckCircle size={12} color='#fff' />}
                </View>
                <Text className={`flex-1 text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                  {habit}
                </Text>
                {isCompleted && <Text className='text-xs font-medium text-emerald-600'>Done</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View className='mt-3 rounded-lg bg-blue-100 p-3'>
          <View className='mb-1 flex-row items-center'>
            <Lightbulb size={16} color='#3b82f6' className='mr-1' />
            <Text className='text-sm font-medium text-blue-800'>Pro Tip</Text>
          </View>
          <Text className='text-xs text-blue-700'>
            Consistency is key! Try to complete at least 80% of your daily habits to stay on track with your weekly
            goals.
          </Text>
        </View>
      </View>
    </Card>
  );
}
