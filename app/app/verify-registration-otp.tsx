import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import EvraLogo from "../components/EvraLogo";
import Constants from "expo-constants";

export default function VerifyRegistrationOtpScreen() {
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<{ otp?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleVerify = async () => {
    setLoading(true);
    try {
      setApiError(null);
      setErrors({});
      const normalizedEmail = Array.isArray(email)
        ? email[0]
        : String(email || "");
      const API_BASE_URL =
        Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${API_BASE_URL}/verify-registration-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        const msg = backendMsg || "Verification failed";
        if (
          response.status === 400 &&
          /invalid\s+otp/i.test(String(backendMsg))
        ) {
          setErrors({ otp: backendMsg });
        }
        setApiError(msg);
        return;
      }
      Alert.alert(
        "Success",
        "Registration verified! Please set your preferences."
      );
      router.push({
        pathname: "./initial-preferences",
        params: { email: normalizedEmail },
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setApiError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-green-50 px-4">
      {/* Logo */}
      <View className="items-center mb-8">
        <EvraLogo size={64} />
        <Text
          className="text-3xl"
          style={{ color: "#114131", fontFamily: "SourceSansPro" }}
        >
          Evra
        </Text>
        <Text className="mt-1" style={{ color: "#114131", fontFamily: "Evra" }}>
          Your Agent for Better Health
        </Text>
      </View>
      {/* Card */}
      <View className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 items-center">
        <Text className="text-2xl font-bold mb-2 text-center">
          Verify Registration OTP
        </Text>
        <Text className="text-gray-500 mb-6 text-center">
          Enter the OTP sent to your email
        </Text>
        {apiError ? (
          <View className="w-full rounded-md border border-red-400 bg-red-100 p-3 mb-4">
            <Text className="text-red-800 text-sm">{apiError}</Text>
          </View>
        ) : null}
        {/* OTP Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">OTP</Text>
          <TextInput
            className={`border rounded-md px-4 py-3 w-full text-base bg-gray-50 focus:border-green-500 ${
              errors.otp ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter OTP"
            value={otp}
            onChangeText={(value) => {
              setOtp(value);
              if (errors.otp) setErrors({});
              if (apiError) setApiError(null);
            }}
            keyboardType="numeric"
            editable={!loading}
          />
          {errors.otp ? (
            <Text className="text-red-500 text-sm mt-1">{errors.otp}</Text>
          ) : null}
        </View>
        {/* Verify Button */}
        <TouchableOpacity
          className="rounded-md w-full py-3 mt-2 mb-2 items-center disabled:opacity-50"
          style={{ backgroundColor: "#059669" }}
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
