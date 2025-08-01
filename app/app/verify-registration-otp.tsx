import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import EvraLogo from "../components/EvraLogo";

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
      Alert.alert(
        "Success",
        "Registration verified! Please set your preferences."
      );
      router.push({ pathname: "./initial-preferences", params: { email } });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Alert.alert("Verification Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-green-50 px-4">
      {/* Logo */}
      <View className="items-center mb-8">
        <EvraLogo size={64} />
        <Text className="text-3xl font-bold text-green-700">Evra</Text>
        <Text className="text-green-600 mt-1">Your Personal Health Coach</Text>
      </View>
      {/* Card */}
      <View className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 items-center">
        <Text className="text-2xl font-bold mb-2 text-center">
          Verify Registration OTP
        </Text>
        <Text className="text-gray-500 mb-6 text-center">
          Enter the OTP sent to your email
        </Text>
        {/* OTP Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">OTP</Text>
          <TextInput
            className="border border-gray-300 rounded-md px-4 py-3 w-full text-base bg-gray-50 focus:border-green-500"
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            editable={!loading}
          />
        </View>
        {/* Verify Button */}
        <TouchableOpacity
          className="bg-green-600 rounded-md w-full py-3 mt-2 mb-2 items-center disabled:opacity-50"
          onPress={handleVerify}
          disabled={loading || !otp}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
