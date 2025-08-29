import Card from '@/components/ui/card';
import { BookOpen, Star, Target } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface WeeklyReflectionProps {
  weekStart: Date;
  weekEnd: Date;
  completedGoals: number;
  totalGoals: number;
  onSave: (reflection: string, rating: number, nextWeekGoals: string[]) => void;
  onClose: () => void;
  initialReflection?: string;
  initialRating?: number;
  initialGoals?: string[];
  isDarkMode: boolean;
}

export default function WeeklyReflection({
  weekStart,
  weekEnd,
  completedGoals,
  totalGoals,
  onSave,
  onClose,
  initialReflection,
  initialRating,
  initialGoals,
  isDarkMode,
}: WeeklyReflectionProps) {
  const [reflection, setReflection] = useState(initialReflection || '');
  const [rating, setRating] = useState(initialRating || 0);
  const [nextWeekGoals, setNextWeekGoals] = useState<string[]>(
    initialGoals && initialGoals.length > 0 ? initialGoals : ['']
  );

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleAddGoal = () => {
    setNextWeekGoals([...nextWeekGoals, '']);
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
    const filteredGoals = nextWeekGoals.filter((goal) => goal.trim() !== '');
    onSave(reflection, rating, filteredGoals);
  };

  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <View className='absolute inset-0 items-center justify-center bg-black bg-opacity-50'>
      <View className={`m-4 max-h-[90%] w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <ScrollView className='p-6'>
          {/* Header */}
          <View className='mb-4 flex-row items-center'>
            <BookOpen size={24} color={isDarkMode ? '#60a5fa' : '#3b82f6'} className='mr-2' />
            <Text className={`text-xl font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              Weekly Reflection
            </Text>
          </View>

          {/* Week Summary */}
          <Card className='border-0'>
            <View className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <Text className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-blue-800'}`}>
                Week of {formatDate(weekStart)} - {formatDate(weekEnd)}
              </Text>
              <View className='flex-row items-center justify-between'>
                <View className='flex-row items-center'>
                  <Target size={16} color={isDarkMode ? '#34d399' : '#3b82f6'} className='mr-1' />
                  <Text className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-blue-700'}`}>
                    {completedGoals}/{totalGoals} goals completed
                  </Text>
                </View>
                <Text className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-blue-800'}`}>
                  {completionRate.toFixed(0)}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Week Rating */}
          <View className='mb-4'>
            <Text className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              How would you rate this week?
            </Text>
            <View className='flex-row justify-center'>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} className='mx-1'>
                  <Star
                    size={24}
                    color={star <= rating ? '#fbbf24' : isDarkMode ? '#4b5563' : '#d1d5db'}
                    fill={star <= rating ? '#fbbf24' : 'none'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text className={`mt-1 text-center text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {rating === 0 && 'Tap to rate'}
              {rating === 1 && 'Very challenging'}
              {rating === 2 && 'Somewhat difficult'}
              {rating === 3 && 'Okay'}
              {rating === 4 && 'Pretty good'}
              {rating === 5 && 'Excellent!'}
            </Text>
          </View>

          {/* Reflection */}
          <View className='mb-4'>
            <Text className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              What went well this week?
            </Text>
            <TextInput
              placeholder='Share your thoughts on your achievements, challenges, and learnings...'
              placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
              value={reflection}
              onChangeText={setReflection}
              multiline
              numberOfLines={4}
              className={`rounded-lg border px-3 py-2 text-sm ${
                isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
              }`}
              textAlignVertical='top'
            />
          </View>

          {/* Next Week Goals */}
          <View className='mb-4'>
            <Text className={`mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Goals for next week
            </Text>
            {nextWeekGoals.map((goal, index) => (
              <View key={index} className='mb-2 flex-row items-center'>
                <TextInput
                  placeholder={`Goal ${index + 1}`}
                  placeholderTextColor={isDarkMode ? '#6b7280' : '#9ca3af'}
                  value={goal}
                  onChangeText={(text) => handleUpdateGoal(index, text)}
                  className={`mr-2 flex-1 rounded-lg border px-3 py-2 text-sm ${
                    isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
                  }`}
                />
                {nextWeekGoals.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveGoal(index)}
                    className={`h-8 w-8 items-center justify-center rounded-full ${
                      isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                    }`}
                  >
                    <Text className={isDarkMode ? 'text-red-400' : 'text-red-600'}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={handleAddGoal}
              className={`self-start rounded-lg px-3 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>+ Add Goal</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View className='mt-4 flex-row'>
            <TouchableOpacity
              onPress={onClose}
              className={`mr-2 flex-1 rounded-lg px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}
            >
              <Text className={`text-center font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              className={`ml-2 flex-1 rounded-lg px-4 py-2 ${isDarkMode ? 'bg-blue-900' : 'bg-blue-600'}`}
            >
              <Text className='text-center font-medium text-white'>Save Reflection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
