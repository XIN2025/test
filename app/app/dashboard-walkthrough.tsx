// NOTE: Make sure to install @react-native-async-storage/async-storage in your project.
// npm install @react-native-async-storage/async-storage
import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const steps = [
  "Welcome to your Dashboard!",
  "Use the Chat tab to talk to your assistant.",
  "Check Supplements for recommendations.",
  "View your Orders and track status.",
  "Edit your Profile and preferences here.",
];

export default function DashboardWalkthrough() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  const nextStep = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Set walkthrough complete flag and redirect to dashboard
      await AsyncStorage.setItem("walkthroughComplete", "true");
      router.replace("/dashboard");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Walkthrough</Text>
      <Text style={styles.content}>{steps[step]}</Text>
      <Button
        title={step === steps.length - 1 ? "Finish" : "Next"}
        onPress={nextStep}
      />
      {step > 0 && <Button title="Back" onPress={() => setStep(step - 1)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
});
