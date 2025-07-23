import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 24, marginBottom: 24 }}>Login</Text>
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title="Login"
        onPress={() => {
          /* TODO: Add login logic */
        }}
      />
      <TouchableOpacity
        onPress={() => router.push({ pathname: "./register" })}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: "#007bff" }}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}
