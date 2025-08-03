import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { useRouter } from "expo-router";
import EvraLogo from "../components/EvraLogo";

export default function Index() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Create a sequence of animations
    const animationSequence = Animated.sequence([
      // Fade in and scale up
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
      // Hold for 1 second
      Animated.delay(1000),
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    // Start the animation
    animationSequence.start(() => {
      // Navigate to login after animation completes
      router.replace("./login");
    });
  }, [fadeAnim, scaleAnim, router]);

  return (
    <View className="flex-1 justify-center items-center bg-green-50">
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <EvraLogo size={80} />
        <Text
          className="text-4xl font-bold mb-2"
          style={{ color: "#114131", fontFamily: "Evra" }}
        >
          Evra
        </Text>
        <Text
          className="text-lg"
          style={{ color: "#114131", fontFamily: "Evra" }}
        >
          Your Agent for Better Health
        </Text>
      </Animated.View>
    </View>
  );
}
