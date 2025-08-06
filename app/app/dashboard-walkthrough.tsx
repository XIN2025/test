import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

const steps = [
  {
    title: "Welcome to your Dashboard!",
    description: "Let's take a quick tour of your health dashboard.",
    position: { top: 80, left: width / 2 - 100 },
    spotlightSize: 200,
  },
  {
    title: "Chat with EVRA",
    description:
      "Talk to your AI health assistant here for personalized guidance.",
    position: { top: 120, left: 80 },
    spotlightSize: 120,
  },
  {
    title: "Health Score",
    description: "Track your overall health progress with this score.",
    position: { top: 120, right: 80 },
    spotlightSize: 160,
  },
  {
    title: "Today's Metrics",
    description: "Monitor your daily health metrics like heart rate and steps.",
    position: { top: 300, left: width / 2 - 150 },
    spotlightSize: 300,
  },
  {
    title: "Weekly Goals",
    description: "Set and track your health goals here.",
    position: { top: 500, left: width / 2 - 150 },
    spotlightSize: 200,
  },
];

export default function DashboardWalkthrough() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const [animation] = useState(new Animated.Value(0));

  const animateSpotlight = (toValue: number) => {
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const nextStep = async () => {
    if (step < steps.length - 1) {
      animateSpotlight(0);
      setTimeout(() => {
        setStep(step + 1);
        animateSpotlight(1);
      }, 300);
    } else {
      await AsyncStorage.setItem("walkthroughComplete", "true");
      router.replace("/dashboard");
    }
  };

  const prevStep = () => {
    if (step > 0) {
      animateSpotlight(0);
      setTimeout(() => {
        setStep(step - 1);
        animateSpotlight(1);
      }, 300);
    }
  };

  const currentStep = steps[step];
  const maskOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const spotlightScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Dark overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "black", opacity: maskOpacity },
        ]}
      />

      {/* Spotlight */}
      <Animated.View
        style={[
          styles.spotlight,
          {
            ...currentStep.position,
            width: currentStep.spotlightSize,
            height: currentStep.spotlightSize,
            borderRadius: currentStep.spotlightSize / 2,
            transform: [{ scale: spotlightScale }],
          },
        ]}
      />

      {/* Content */}
      <View style={[styles.content, currentStep.position]}>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.description}>{currentStep.description}</Text>
      </View>

      {/* Navigation buttons */}
      <View style={styles.navigation}>
        {step > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={prevStep}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.nextButton]}
          onPress={nextStep}
        >
          <Text style={styles.buttonText}>
            {step === steps.length - 1 ? "Finish" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spotlight: {
    position: "absolute",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  content: {
    position: "absolute",
    padding: 20,
    backgroundColor: "transparent",
    alignItems: "center",
    zIndex: 2,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    maxWidth: 300,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navigation: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  backButton: {
    backgroundColor: "#475569",
  },
  nextButton: {
    backgroundColor: "#059669",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
