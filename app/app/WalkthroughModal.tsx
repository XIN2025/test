import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";

const steps = [
  "Welcome to your Dashboard!",
  "Use the Chat tab to talk to your assistant.",
  "Check Supplements for recommendations.",
  "View your Orders and track status.",
  "Edit your Profile and preferences here.",
];

export default function WalkthroughModal({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onFinish();
      setStep(0);
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
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: 300,
    alignItems: "center",
    elevation: 5,
    position: "absolute",
    top: 80,
    alignSelf: "center",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
