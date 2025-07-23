import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function RegisterScreen() {
  const [name, setName] = useState("");
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
      <Text style={{ fontSize: 24, marginBottom: 24 }}>Register</Text>
      <TextInput
        style={{
          width: 250,
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 5,
          padding: 10,
          marginBottom: 16,
        }}
        placeholder="Name"
        value={name}
        onChangeText={setName}
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
        title="Register"
        onPress={() => {
          /* TODO: Add registration logic */
        }}
      />
      <TouchableOpacity
        onPress={() => router.push({ pathname: "./login" })}
        style={{ marginTop: 16 }}
      >
        <Text style={{ color: "#007bff" }}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}
