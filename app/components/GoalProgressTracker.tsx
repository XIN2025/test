import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
// @ts-ignore
import { TrendingUp, Plus, Minus, Target } from 'lucide-react-native';

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
  const [customValue, setCustomValue] = useState('');

  const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
  const isCompleted = currentValue >= targetValue;

  const handleQuickUpdate = (increment: number) => {
    const newValue = Math.max(0, currentValue + increment);
    onProgressUpdate(goalId, newValue);
  };

  const handleCustomUpdate = () => {
    const value = parseFloat(customValue);
    if (isNaN(value) || value < 0) {
      Alert.alert('Invalid Value', 'Please enter a valid number');
      return;
    }
    onProgressUpdate(goalId, value);
    setCustomValue('');
  };

  return (
    <View className='rounded-lg border border-gray-100 bg-white p-4'>
      <View className='mb-2 flex-row items-center justify-between'>
        <Text className='flex-1 text-sm font-medium text-gray-800'>{title}</Text>
        <View className='flex-row items-center'>
          <Target size={16} color={isCompleted ? '#059669' : '#64748b'} className='mr-1' />
          <Text className={`text-sm font-semibold ${isCompleted ? 'text-emerald-600' : 'text-gray-700'}`}>
            {currentValue}/{targetValue} {unit}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className='mb-3 h-2 rounded-full bg-gray-200'>
        <View
          className={`h-2 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </View>

      {/* Progress Percentage */}
      <Text className='mb-3 text-xs text-gray-600'>{progressPercentage.toFixed(0)}% complete</Text>

      {/* Quick Actions */}
      {showQuickActions && (
        <View className='space-y-2'>
          <View className='flex-row items-center justify-between'>
            <Text className='text-xs text-gray-600'>Quick update:</Text>
            <View className='flex-row'>
              <TouchableOpacity
                onPress={() => handleQuickUpdate(-1)}
                className='mr-2 h-8 w-8 items-center justify-center rounded-full bg-red-100'
              >
                <Minus size={14} color='#dc2626' />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickUpdate(1)}
                className='h-8 w-8 items-center justify-center rounded-full bg-emerald-100'
              >
                <Plus size={14} color='#059669' />
              </TouchableOpacity>
            </View>
          </View>

          {/* Custom Value Input */}
          <View className='flex-row items-center'>
            <TextInput
              placeholder={`Enter ${unit}`}
              value={customValue}
              onChangeText={setCustomValue}
              keyboardType='numeric'
              className='mr-2 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm'
            />
            <TouchableOpacity onPress={handleCustomUpdate} className='rounded-lg bg-blue-600 px-3 py-2'>
              <Text className='text-sm font-medium text-white'>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Completion Status */}
      {isCompleted && (
        <View className='mt-2 rounded-lg bg-emerald-50 p-2'>
          <Text className='text-center text-xs font-medium text-emerald-700'>🎉 Goal completed! Great job!</Text>
        </View>
      )}
    </View>
  );
}
