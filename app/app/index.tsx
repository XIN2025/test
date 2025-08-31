import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Alert, Platform } from 'react-native';
import EvraLogo from '../components/EvraLogo';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notifications for foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Request push notification permissions
  // const registerForPushNotificationsAsync = async () => {
  //   let token;
  //   if (Constants.isDevice) {
  //     const { status: existingStatus } =
  //       await Notifications.getPermissionsAsync();
  //     let finalStatus = existingStatus;

  //     if (existingStatus !== "granted") {
  //       const { status } = await Notifications.requestPermissionsAsync();
  //       finalStatus = status;
  //     }

  //     if (finalStatus !== "granted") {
  //       Alert.alert("Failed to get push token for push notification!");
  //       return;
  //     }

  //     token = (await Notifications.getExpoPushTokenAsync()).data;
  //     console.log("Expo Push Token:", token);
  //     Alert.alert("Expo Push Token " + token);
  //   } else {
  //     Alert.alert("Must use physical device for Push Notifications");
  //   }

  //   if (Platform.OS === "android") {
  //     Notifications.setNotificationChannelAsync("default", {
  //       name: "default",
  //       importance: Notifications.AndroidImportance.MAX,
  //       vibrationPattern: [0, 250, 250, 250],
  //       lightColor: "#FF231F7C",
  //     });
  //   }

  //   return token;
  // };

  // useEffect(() => {
  //   registerForPushNotificationsAsync();

  //   // Listener for foreground notifications
  //   const subscription = Notifications.addNotificationReceivedListener(
  //     (notification) => {
  //       Alert.alert(
  //         "A new notification arrived!",
  //         JSON.stringify(notification)
  //       );
  //     }
  //   );

  //   // Listener for when a user taps a notification
  //   const responseSubscription =
  //     Notifications.addNotificationResponseReceivedListener((response) => {
  //       console.log("Notification response:", response);
  //     });

  //   return () => {
  //     subscription.remove();
  //     responseSubscription.remove();
  //   };
  // }, []);

  useEffect(() => {
    // Animation sequence
    const animationSequence = Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      // Navigate to login after animation completes
      router.replace('./login');
    });
  }, [fadeAnim, scaleAnim, router]);

  return (
    <View className='flex-1 items-center justify-center bg-green-50'>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <EvraLogo size={80} />
        <Text className='mb-2 text-4xl' style={{ color: '#114131', fontFamily: 'SourceSansPro' }}>
          Evra
        </Text>
        <Text className='text-lg' style={{ color: '#114131', fontFamily: 'Evra' }}>
          Your Agent for Better Health
        </Text>
      </Animated.View>
    </View>
  );
}
