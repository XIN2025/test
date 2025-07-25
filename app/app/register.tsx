import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Registration failed");
      Alert.alert("Success", "OTP sent to your email.");
      router.push({ pathname: "./verify-registration-otp", params: { email } });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-green-50 px-4">
      {/* Logo */}
      <View className="items-center mb-8">
        <View className="bg-green-600 rounded-full w-20 h-20 flex items-center justify-center mb-4">
          <Text className="text-3xl text-white">♡</Text>
        </View>
        <Text className="text-3xl font-bold text-green-700">Evra</Text>
        <Text className="text-green-600 mt-1">Your Personal Health Coach</Text>
      </View>
      {/* Card */}
      <View className="bg-white w-full max-w-md rounded-xl shadow-lg p-8 items-center">
        <Text className="text-2xl font-bold mb-2 text-center">
          Create Account
        </Text>
        <Text className="text-gray-500 mb-6 text-center">
          Sign up to start your health journey
        </Text>
        {/* Name Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">Name</Text>
          <TextInput
            className="border border-gray-300 rounded-md px-4 py-3 w-full text-base bg-gray-50 focus:border-green-500"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            editable={!loading}
          />
        </View>
        {/* Email Input */}
        <View className="w-full mb-4">
          <Text className="mb-1 text-gray-700">Email</Text>
          <TextInput
            className="border border-gray-300 rounded-md px-4 py-3 w-full text-base bg-gray-50 focus:border-green-500"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />
        </View>
        {/* Register Button */}
        <TouchableOpacity
          className="bg-green-600 rounded-md w-full py-3 mt-2 mb-2 items-center disabled:opacity-50"
          onPress={handleRegister}
          disabled={loading || !name || !email}
        >
          <Text className="text-white text-lg font-semibold">
            {loading ? "Registering..." : "Register"}
          </Text>
        </TouchableOpacity>
        {/* Sign In Link */}
        <Text className="mt-2 text-gray-700 text-center">
          Already have an account?{" "}
          <Text
            className="text-green-600 font-semibold"
            onPress={() => router.push("./login")}
          >
            Sign In
          </Text>
        </Text>
      </View>
      {/* Terms */}
      <Text className="text-xs text-gray-400 mt-8 text-center">
        By signing up, you agree to our{" "}
        <Text className="underline">Terms of Service</Text> and{" "}
        <Text className="underline">Privacy Policy</Text>
      </Text>
    </View>
  );
}
