import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator, SafeAreaView } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { nudgeApi } from '../services/nudgeApi';
import { useAuth } from '../context/AuthContext';

const PermissionsPage = () => {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();

  // Helper to authenticate user before navigating to dashboard
  const authenticateAndContinue = async () => {
    // Get email and name from params (normalize for array or string)
    const email = Array.isArray(params?.email) ? params.email[0] : String(params?.email || '');
    const name = Array.isArray(params?.name) ? params.name[0] : String(params?.name || '');

    if (email && name) {
      try {
        await login(email, name);
        console.log('authenticated');
        // Only redirect after successful authentication
        router.replace({
          pathname: '/dashboard/main',
          params,
        });
      } catch (err) {
        // If login fails, do not redirect, but you may want to handle this
        console.error('Failed to authenticate user in PermissionsPage:', err);
        Alert.alert('Authentication Error', 'Failed to authenticate user. Please try again.');
      }
    } else {
      // If email or name is missing, do not redirect
      Alert.alert('Missing Information', 'User email or name not found. Cannot continue.');
    }
  };

  const registerForPushNotificationsAsync = async () => {
    let token;
    if (!Constants.isDevice) {
      Alert.alert('Must use physical device for Push Notifications');
      setPermissionStatus('denied');
      return;
    }
    setLoading(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        Alert.alert('Failed to get push token for push notification!');
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;

      // Send the FCM token to the backend using nudgeApi
      // Assumes user's email is available in params.email
      const email = params?.email;
      if (!email) {
        Alert.alert('Error', 'User email not found. Cannot register FCM token.');
        return;
      }

      try {
        const { success, message } = await nudgeApi.registerFcmToken(String(email), token);
        if (!success) {
          throw new Error(message || 'Failed to register FCM token.');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to register FCM token with backend.');
        return;
      }

      Alert.alert('Notifications enabled!', 'You will now receive nudges and reminders.');

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // After enabling, proceed to next step (authenticate and go to dashboard)
      await authenticateAndContinue();
    } catch (e) {
      Alert.alert('Error', 'An error occurred while requesting permissions.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for skipping notifications
  const handleSkip = async () => {
    await authenticateAndContinue();
  };

  useEffect(() => {
    // Check current notification permission status on mount
    const checkPermission = async () => {
      if (!Constants.isDevice) {
        setPermissionStatus('denied');
        return;
      }
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
    };
    checkPermission();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
          backgroundColor: '#F9FAFB',
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: '#fff',
            borderRadius: 20,
            paddingVertical: 36,
            paddingHorizontal: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: 'bold',
              color: '#114131',
              marginBottom: 12,
              textAlign: 'center',
              letterSpacing: 0.2,
            }}
          >
            Enable Notifications
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: '#114131',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 22,
            }}
          >
            To help you stay on track, Evra would like to send you notifications for nudges and reminders.
          </Text>

          {permissionStatus === 'granted' && (
            <View
              style={{
                backgroundColor: '#D1FAE5',
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                marginBottom: 20,
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: '#047857',
                  fontWeight: '600',
                  textAlign: 'center',
                  fontSize: 15,
                }}
              >
                Notifications are enabled!
              </Text>
            </View>
          )}

          {permissionStatus !== 'granted' && (
            <TouchableOpacity
              style={{
                backgroundColor: loading ? '#A7F3D0' : '#059669',
                borderRadius: 8,
                paddingVertical: 14,
                width: '100%',
                alignItems: 'center',
                marginBottom: 14,
                opacity: loading ? 0.7 : 1,
              }}
              onPress={registerForPushNotificationsAsync}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color='#fff' />
              ) : (
                <Text
                  style={{
                    color: '#fff',
                    fontWeight: 'bold',
                    fontSize: 16,
                    letterSpacing: 0.2,
                  }}
                >
                  Enable Notifications
                </Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 8,
              paddingVertical: 14,
              width: '100%',
              alignItems: 'center',
              marginBottom: 0,
              marginTop: 2,
              borderWidth: 1,
              borderColor: '#D1D5DB',
            }}
            onPress={handleSkip}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text
              style={{
                color: '#6B7280',
                fontWeight: '600',
                fontSize: 16,
                letterSpacing: 0.2,
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>

          {permissionStatus === 'denied' && (
            <View
              style={{
                marginTop: 22,
                backgroundColor: '#FEE2E2',
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: '#B91C1C',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                Notifications are disabled. You can enable them in your device settings.
              </Text>
            </View>
          )}

          {!Constants.isDevice && (
            <View
              style={{
                marginTop: 18,
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                paddingVertical: 10,
                paddingHorizontal: 16,
                width: '100%',
              }}
            >
              <Text
                style={{
                  color: '#B45309',
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                Push notifications only work on a physical device.
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PermissionsPage;
