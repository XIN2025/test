import { useAuth } from '@/context/AuthContext';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function VerifyRegistrationOtpScreen() {
  const { email } = useLocalSearchParams();
  const { name } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState<{ otp?: string }>({});
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

  const handleVerify = async () => {
    setLoading(true);
    try {
      setApiError(null);
      setErrors({});
      const normalizedEmail = Array.isArray(email) ? email[0] : String(email || '');
      const normalizedName = Array.isArray(name) ? name[0] : String(name || '');
      const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/verify-registration-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, otp }),
      });
      let data: any = null;
      try {
        data = await response.json();
      } catch (_) {
        data = null;
      }
      if (!response.ok) {
        const backendMsg = data?.detail || data?.message;
        const msg = backendMsg || 'Verification failed';
        if (response.status === 400 && /invalid\s+otp/i.test(String(backendMsg))) {
          setErrors({ otp: backendMsg });
        }
        setApiError(msg);
        return;
      }
      Alert.alert('Success', 'Registration verified! Please set your preferences.');
      router.push({
        pathname: './initial-preferences',
        params: { email: normalizedEmail, name: normalizedName },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
                <Text className='mb-2 text-center text-2xl font-bold'>Verify Registration OTP</Text>
                <Text className='mb-6 text-center text-gray-500'>Enter the OTP sent to your email</Text>
                {apiError ? (
                  <View className='mb-4 w-full rounded-md border border-red-400 bg-red-100 p-3'>
                    <Text className='text-sm text-red-800'>{apiError}</Text>
                  </View>
                ) : null}
                {/* OTP Input */}
                <View className='mb-4 w-full'>
                  <Text className='mb-1 text-gray-700'>OTP</Text>
                  <TextInput
                    className={`w-full rounded-md border bg-gray-50 px-4 py-3 text-base focus:border-green-500 ${
                      errors.otp ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder='Enter OTP'
                    value={otp}
                    onChangeText={(value) => {
                      setOtp(value);
                      if (errors.otp !== undefined) {
                        setErrors(() => ({}));
                      }
                      if (apiError) setApiError(null);
                    }}
                    keyboardType='numeric'
                    editable={!loading}
                    returnKeyType='done'
                    onSubmitEditing={Keyboard.dismiss}
                    maxLength={6}
                  />
                  {errors.otp ? <Text className='mt-1 text-sm text-red-500'>{errors.otp}</Text> : null}
                </View>
                {/* Verify Button */}
                <TouchableOpacity
                  className='mb-2 mt-2 w-full items-center rounded-md py-3 disabled:opacity-50'
                  style={{ backgroundColor: '#059669' }}
                  onPress={handleVerify}
                  disabled={loading || !otp}
                >
                  <Text className='text-lg font-semibold text-white'>{loading ? 'Verifying...' : 'Verify'}</Text>
                </TouchableOpacity>
                {/* Tap to dismiss keyboard hint */}
                <Text className='mt-2 text-center text-xs text-gray-400'>Tap anywhere to dismiss keyboard</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
