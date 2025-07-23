import React, { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function VerifyRegistrationOtpScreen() {
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/verify-registration-otp",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Verification failed");
      Alert.alert("Success", "Registration verified! Please login.");
      router.push("./login");
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Alert.alert("Verification Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 24 }}>
        Verify Registration OTP
      </Text>
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder="OTP"
        value={otp}
        onChangeText={setOtp}
        keyboardType="numeric"
      />
      <Button
        title={loading ? "Verifying..." : "Verify"}
        onPress={handleVerify}
        disabled={loading}
      />
    </View>
  );
}
