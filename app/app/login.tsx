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
interface LoginFormData {
  email: string;
}

interface ValidationErrors {
  email?: string;
}

interface ApiResponse {
  detail?: string;
  success?: boolean;
}

export default function LoginScreen() {
  const [formData, setFormData] = useState<LoginFormData>({ email: '' });
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

    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear the specific field error entirely so isFormValid recalculates correctly
    if (errors[field] !== undefined) {
      setErrors((prev) => {
        const { [field]: _removed, ...rest } = prev;
        return rest;
      });
    }
    if (apiError) setApiError(null);
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      setApiError(null);
      const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.trim() }),
      });

      // Parse JSON if available, but don't crash if not
      let data: ApiResponse | null = null;
      try {
        data = (await response.json()) as ApiResponse;
      } catch (_) {
        data = null;
      }

      if (!response.ok) {
        const backendMsg = data?.detail || (data as any)?.message;
        const message = backendMsg || 'Login failed. Please try again.';

        // Map known errors to field/general errors
        if (response.status === 404 && backendMsg) {
          if (/not\s+found/i.test(backendMsg) || /email/i.test(backendMsg)) {
            setErrors((prev) => ({ ...prev, email: backendMsg }));
          }
        }
        if (response.status === 403 && backendMsg) {
          // User not verified -> show as banner
          setApiError(backendMsg);
        }
        if (response.status !== 404 && response.status !== 403) {
          setApiError(message);
        }
        return;
      }

      Alert.alert('Success', 'OTP sent to your email.');
      router.push({
        pathname: './verify-login-otp',
        params: { email: formData.email.trim() },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.email.trim().length > 0 && Object.keys(errors).length === 0;

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
                <Text className='mb-2 text-center text-2xl font-bold'>Welcome Back</Text>
                <Text className='mb-6 text-center text-gray-500'>Sign in to continue your health journey</Text>
                {apiError ? (
                  <View className='mb-4 w-full rounded-md border border-red-400 bg-red-100 p-3'>
                    <Text className='text-sm text-red-800'>{apiError}</Text>
                  </View>
                ) : null}
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
                {/* Sign In Button */}
                <TouchableOpacity
                  className={`mb-2 mt-2 w-full items-center rounded-md py-3 ${
                    !isFormValid || loading ? 'opacity-50' : ''
                  }`}
                  style={{ backgroundColor: '#059669' }}
                  onPress={handleLogin}
                  disabled={!isFormValid || loading}
                >
                  <Text className='text-lg font-semibold text-white'>{loading ? 'Sending OTP...' : 'Sign In'}</Text>
                </TouchableOpacity>
                {/* Sign Up Link */}
                <Text className='mt-2 text-center text-gray-700'>
                  Don&apos;t have an account?{' '}
                  <Text
                    className='font-semibold'
                    style={{ color: '#059669' }}
                    onPress={() => router.push('./register')}
                  >
                    Sign Up
                  </Text>
                </Text>
              </View>
              {/* Terms */}
              <Text className='mt-8 text-center text-xs text-gray-400'>
                By signing in, you agree to our <Text className='underline'>Terms of Service</Text> and{' '}
                <Text className='underline'>Privacy Policy</Text>
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
