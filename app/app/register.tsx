import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import EvraLogo from '../components/EvraLogo';

// TypeScript interfaces
interface RegisterFormData {
  name: string;
  email: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
}

interface ApiResponse {
  detail?: string;
  success?: boolean;
}

export default function RegisterScreen() {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard/main');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render if loading or already authenticated
  if (isLoading || isAuthenticated) {
    return null;
  }

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters long';
    }
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return 'Name can only contain letters and spaces';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    const nameError = validateName(formData.name);
    if (nameError) {
      newErrors.name = nameError;
    }

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Remove the field from the errors object entirely to allow re-enable
    if (errors[field] !== undefined) {
      setErrors((prev) => {
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }
    if (apiError) setApiError(null);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      setApiError(null);
      const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
        }),
      });

      // Try to parse any JSON error payload
      let data: ApiResponse | null = null;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (_) {
        data = null;
      }

      if (!response.ok) {
        const backendMsg = data?.detail || (data as any)?.message;
        const message = backendMsg || 'Registration failed. Please try again.';

        // Map known 400 detail to the email field error if applicable
        if (response.status === 400 && backendMsg) {
          if (/email/i.test(backendMsg)) {
            setErrors((prev) => ({ ...prev, email: backendMsg }));
          }
        }
        setApiError(message);
        return;
      }

      Alert.alert('Success', 'OTP sent to your email.');
      router.push({
        pathname: './verify-registration-otp',
        params: {
          email: formData.email.trim(),
          name: formData.name.trim(),
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.name.trim().length > 0 && formData.email.trim().length > 0 && Object.keys(errors).length === 0;

  return (
    <SafeAreaView className='flex-1 bg-green-50'>
      <KeyboardAvoidingView
        className='flex-1'
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            className='flex-1'
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps='handled'
            showsVerticalScrollIndicator={false}
          >
            <View className='flex-1 items-center justify-center bg-green-50 px-4 py-8'>
              {/* Logo */}
              <View className='mb-8 items-center'>
                <EvraLogo size={64} />
                <Text className='text-3xl' style={{ color: '#114131', fontFamily: 'SourceSansPro' }}>
                  Evra
                </Text>
                <Text className='mt-1' style={{ color: '#114131', fontFamily: 'Evra' }}>
                  Your Agent for Better Health
                </Text>
              </View>
              {/* Card */}
              <View className='w-full max-w-md items-center rounded-xl bg-white p-8 shadow-lg'>
                <Text className='mb-2 text-center text-2xl font-bold'>Create Account</Text>
                <Text className='mb-6 text-center text-gray-500'>Sign up to start your health journey</Text>
                {apiError ? (
                  <View className='mb-4 w-full rounded-md border border-red-400 bg-red-100 p-3'>
                    <Text className='text-sm text-red-800'>{apiError}</Text>
                  </View>
                ) : null}
                {/* Name Input */}
                <View className='mb-4 w-full'>
                  <Text className='mb-1 text-gray-700'>Name</Text>
                  <TextInput
                    className={`w-full rounded-md border bg-gray-50 px-4 py-3 text-base ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder='Enter your name'
                    value={formData.name}
                    onChangeText={(value: string) => handleInputChange('name', value)}
                    editable={!loading}
                    autoComplete='name'
                    textContentType='name'
                    autoCapitalize='words'
                    returnKeyType='next'
                    onSubmitEditing={() => {
                      // Focus next input or dismiss keyboard
                      Keyboard.dismiss();
                    }}
                  />
                  {errors.name && <Text className='mt-1 text-sm text-red-500'>{errors.name}</Text>}
                </View>
                {/* Email Input */}
                <View className='mb-4 w-full'>
                  <Text className='mb-1 text-gray-700'>Email</Text>
                  <TextInput
                    className={`w-full rounded-md border bg-gray-50 px-4 py-3 text-base ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder='Enter your email'
                    value={formData.email}
                    onChangeText={(value: string) => handleInputChange('email', value)}
                    autoCapitalize='none'
                    keyboardType='email-address'
                    editable={!loading}
                    autoComplete='email'
                    textContentType='emailAddress'
                    returnKeyType='done'
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {errors.email && <Text className='mt-1 text-sm text-red-500'>{errors.email}</Text>}
                </View>
                {/* Register Button */}
                <TouchableOpacity
                  className={`mb-2 mt-2 w-full items-center rounded-md py-3 ${
                    !isFormValid || loading ? 'opacity-50' : ''
                  }`}
                  style={{ backgroundColor: '#059669' }}
                  onPress={handleRegister}
                  disabled={!isFormValid || loading}
                >
                  <Text className='text-lg font-semibold text-white'>{loading ? 'Registering...' : 'Register'}</Text>
                </TouchableOpacity>
                {/* Sign In Link */}
                <Text className='mt-2 text-center text-gray-700'>
                  Already have an account?{' '}
                  <Text className='font-semibold' style={{ color: '#059669' }} onPress={() => router.push('./login')}>
                    Sign In
                  </Text>
                </Text>
              </View>
              {/* Terms */}
              <Text className='mt-8 text-center text-xs text-gray-400'>
                By signing up, you agree to our <Text className='underline'>Terms of Service</Text> and{' '}
                <Text className='underline'>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
