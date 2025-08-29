import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import EvraLogo from '../components/EvraLogo';
import { handleApiError, userApi } from '../utils/api';
import { validateAge, validateGender } from '../utils/validation';

// TypeScript interfaces
interface PreferencesFormData {
  age: string;
  gender: string;
  healthGoals: string[];
  conditions: string[];
  atRiskConditions: string[];
  tonalStyle: string;
  verbosityStyle: string;
  notifications: boolean;
}

interface PreferencesErrors {
  age?: string;
  gender?: string;
  communicationStyle?: string;
}

const healthGoalsList = [
  'Better Energy',
  'Better Focus / Performance',
  'Reverse Chronic Disease',
  'Prevent Chronic Disease',
  'Social Connection',
  'Mindfulness',
];

const conditionsList = [
  'Type 2 Diabetes / Insulin Resistance',
  'Cardiovascular Disease',
  'High Cholesterol',
  'Cancer',
  'Digestive / Gut Issues',
  'Depression',
  'Anxiety',
  'PCOS',
  'Hormonal Dysregulation (Menopause / Andropause)',
  'ADHD',
  'Chronic Pain',
  'Auto-Immune / Inflammation Related Fatigue',
];

const tonalStyles = ['Formal', 'Friendly'];
const verbosityStyles = ['Concise', 'Detailed'];

const genderOptions = ['Male', 'Female', 'Other'];

export default function InitialPreferences() {
  const { email, name } = useLocalSearchParams();
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated and not setting initial preferences
  useEffect(() => {
    if (!isLoading && isAuthenticated && !email) {
      router.replace('/dashboard/main');
    }
  }, [isAuthenticated, isLoading, email, router]);

  const [formData, setFormData] = useState<PreferencesFormData>({
    age: '',
    gender: '',
    healthGoals: [],
    conditions: [],
    atRiskConditions: [],
    tonalStyle: '',
    verbosityStyle: '',
    notifications: false,
  });

  const [errors, setErrors] = useState<PreferencesErrors>({});
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: PreferencesErrors = {};

    const ageResult = validateAge(formData.age);
    if (!ageResult.isValid) {
      newErrors.age = ageResult.error;
    }

    const genderResult = validateGender(formData.gender);
    if (!genderResult.isValid) {
      newErrors.gender = genderResult.error;
    }

    if (!formData.tonalStyle.trim()) {
      newErrors.communicationStyle = 'Please select a tone (Formal or Friendly)';
    }
    if (!formData.verbosityStyle.trim()) {
      newErrors.communicationStyle = 'Please select a style (Concise or Detailed)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof PreferencesFormData, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof PreferencesErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleSelection = (item: string, list: string[], apply: (newList: string[]) => void) => {
    if (list.includes(item)) {
      apply(list.filter((i) => i !== item));
    } else {
      apply([...list, item]);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const preferences = {
        email,
        age: Number(formData.age) || 0,
        gender: formData.gender || '',
        healthGoals: formData.healthGoals,
        conditions: formData.conditions,
        atRiskConditions: formData.atRiskConditions,
        communicationStyle: [formData.tonalStyle, formData.verbosityStyle].filter(Boolean).join(' - '),
        notifications: formData.notifications,
      };

      await userApi.savePreferences(preferences);

      console.log('Success! Navigating to dashboard...');
      const normalizedEmail = Array.isArray(email) ? email[0] : String(email || '');
      const normalizedName = Array.isArray(name) ? name[0] : String(name || '');

      // Set user as authenticated in the auth context
      await login(normalizedEmail, normalizedName);

      // Store walkthrough trigger in AsyncStorage since URL params get lost in tab navigation
      await AsyncStorage.setItem(`showWalkthrough:${normalizedEmail}`, 'register');

      router.push({
        pathname: '/dashboard/main',
        params: { email: normalizedEmail, name: normalizedName },
      });
    } catch (err) {
      const errorMessage = handleApiError(err);
      Alert.alert('Failed to save preferences.', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.age.trim().length > 0 &&
    formData.gender.trim().length > 0 &&
    formData.tonalStyle.trim().length > 0 &&
    formData.verbosityStyle.trim().length > 0 &&
    Object.keys(errors).length === 0;

  return (
    <View className='flex-1 bg-green-50'>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className='px-4'>
        {/* Logo */}
        <View className='mb-8 mt-8 items-center'>
          <View style={{ marginBottom: 16 }}>
            <EvraLogo size={64} />
          </View>
          <Text className='text-3xl font-bold' style={{ color: '#114131', fontFamily: 'SourceSansPro' }}>
            Evra
          </Text>
          <Text className='mt-1' style={{ color: '#114131', fontFamily: 'Evra' }}>
            Your Agent for Better Health
          </Text>
        </View>

        {/* Card */}
        <View className='mb-8 w-full rounded-xl bg-white p-8 shadow-lg'>
          <Text className='mb-2 text-center text-2xl font-bold'>Tell us about yourself</Text>
          <Text className='mb-6 text-center text-gray-500'>Help us personalize your health experience</Text>

          {/* Age Input */}
          <View className='mb-4 w-full'>
            <Text className='mb-1 text-gray-700'>Age *</Text>
            <TextInput
              className={`w-full rounded-md border bg-gray-50 px-4 py-3 text-base ${
                errors.age ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder='Enter your age'
              value={formData.age}
              onChangeText={(value: string) => {
                // Only allow numbers and limit to reasonable age values
                const numValue = value.replace(/[^0-9]/g, '');
                if (numValue === '' || (parseInt(numValue) >= 0 && parseInt(numValue) <= 120)) {
                  handleInputChange('age', numValue);
                }
              }}
              keyboardType='numeric'
              maxLength={3}
              editable={!loading}
              autoComplete='off'
            />
            {errors.age && <Text className='mt-1 text-sm text-red-500'>{errors.age}</Text>}
          </View>

          {/* Gender Selection */}
          <View className='mb-4 w-full'>
            <Text className='mb-2 font-medium text-gray-700'>Gender *</Text>
            <View className='flex-row flex-wrap gap-2'>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  className={`rounded-full border px-4 py-3 ${
                    formData.gender === option ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.gender === option ? '#059669' : '#f3f4f6',
                    borderColor: formData.gender === option ? '#059669' : '#d1d5db',
                    minWidth: 80,
                  }}
                  onPress={() => handleInputChange('gender', option)}
                  disabled={loading}
                >
                  <Text
                    className={`text-center text-sm font-medium ${
                      formData.gender === option ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.gender && <Text className='mt-1 text-sm text-red-500'>{errors.gender}</Text>}
          </View>

          {/* Health Goals */}
          <View className='mb-4 w-full'>
            <Text className='mb-2 font-medium text-gray-700'>Health Goals</Text>
            <View className='flex-row flex-wrap gap-2'>
              {healthGoalsList.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  className={`rounded-full border px-3 py-2 ${
                    formData.healthGoals.includes(goal) ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.healthGoals.includes(goal) ? '#059669' : '#f3f4f6',
                    borderColor: formData.healthGoals.includes(goal) ? '#059669' : '#d1d5db',
                  }}
                  onPress={() =>
                    toggleSelection(goal, formData.healthGoals, (newGoals) =>
                      handleInputChange('healthGoals', newGoals)
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.healthGoals.includes(goal) ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Existing Conditions */}
          <View className='mb-4 w-full'>
            <Text className='mb-2 font-medium text-gray-700'>Existing Conditions</Text>
            <View className='flex-row flex-wrap gap-2'>
              {conditionsList.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  className={`rounded-full border px-3 py-2 ${
                    formData.conditions.includes(cond) ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.conditions.includes(cond) ? '#059669' : '#f3f4f6',
                    borderColor: formData.conditions.includes(cond) ? '#059669' : '#d1d5db',
                  }}
                  onPress={() =>
                    toggleSelection(cond, formData.conditions, (newConditions) =>
                      handleInputChange('conditions', newConditions)
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.conditions.includes(cond) ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* At Risk Conditions */}
          <View className='mb-4 w-full'>
            <Text className='mb-2 font-medium text-gray-700'>At Risk Conditions</Text>
            <Text className='mb-2 text-sm text-gray-500'>Conditions you want to prevent</Text>
            <View className='flex-row flex-wrap gap-2'>
              {conditionsList.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  className={`rounded-full border px-3 py-2 ${
                    formData.atRiskConditions.includes(cond) ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.atRiskConditions.includes(cond) ? '#059669' : '#f3f4f6',
                    borderColor: formData.atRiskConditions.includes(cond) ? '#059669' : '#d1d5db',
                  }}
                  onPress={() =>
                    toggleSelection(cond, formData.atRiskConditions, (newAtRiskConditions) =>
                      handleInputChange('atRiskConditions', newAtRiskConditions)
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.atRiskConditions.includes(cond) ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Communication Style */}
          <View className='mb-4 w-full'>
            <Text className='mb-2 font-medium text-gray-700'>Preferred Communication Style *</Text>

            {/* Tone Selection */}
            <Text className='mb-2 text-sm text-gray-600'>Tone</Text>
            <View className='mb-4 flex-row flex-wrap gap-2'>
              {tonalStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  className={`rounded-full border px-3 py-2 ${
                    formData.tonalStyle === style ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.tonalStyle === style ? '#059669' : '#f3f4f6',
                    borderColor: formData.tonalStyle === style ? '#059669' : '#d1d5db',
                  }}
                  onPress={() => handleInputChange('tonalStyle', style)}
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${formData.tonalStyle === style ? 'text-white' : 'text-gray-700'}`}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Verbosity Selection */}
            <Text className='mb-2 text-sm text-gray-600'>Detail Level</Text>
            <View className='flex-row flex-wrap gap-2'>
              {verbosityStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  className={`rounded-full border px-3 py-2 ${
                    formData.verbosityStyle === style ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: formData.verbosityStyle === style ? '#059669' : '#f3f4f6',
                    borderColor: formData.verbosityStyle === style ? '#059669' : '#d1d5db',
                  }}
                  onPress={() => handleInputChange('verbosityStyle', style)}
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.verbosityStyle === style ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {errors.communicationStyle && (
              <Text className='mt-1 text-sm text-red-500'>{errors.communicationStyle}</Text>
            )}
          </View>

          {/* Notifications */}
          <View className='mb-6 w-full'>
            <View className='flex-row items-center justify-between'>
              <Text className='font-medium text-gray-700'>Enable Notifications</Text>
              <TouchableOpacity
                className={`rounded-full border px-3 py-2 ${
                  formData.notifications ? 'border-gray-300' : 'border-gray-300 bg-gray-100'
                }`}
                style={{
                  backgroundColor: formData.notifications ? '#059669' : '#f3f4f6',
                  borderColor: formData.notifications ? '#059669' : '#d1d5db',
                }}
                onPress={() => handleInputChange('notifications', !formData.notifications)}
                disabled={loading}
              >
                <Text className={`text-sm font-medium ${formData.notifications ? 'text-white' : 'text-gray-700'}`}>
                  {formData.notifications ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`mb-2 mt-2 w-full items-center rounded-md py-3 ${!isFormValid || loading ? 'opacity-50' : ''}`}
            style={{ backgroundColor: loading ? '#9ca3af' : '#059669' }}
            onPress={handleSubmit}
            disabled={!isFormValid || loading}
          >
            <Text className='text-lg font-semibold text-white'>{loading ? 'Saving...' : 'Save Preferences'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
