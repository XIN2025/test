import React from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function DashboardScreen() {
  const { referenceName, relationship, contactInfo } = useLocalSearchParams();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 28, marginBottom: 24 }}>Dashboard</Text>
      <Text style={{ fontSize: 18, marginBottom: 12 }}>Welcome!</Text>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>
        Reference Name: {referenceName}
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>
        Relationship: {relationship}
      </Text>
      <Text style={{ fontSize: 16, marginBottom: 8 }}>
        Contact Info: {contactInfo}
      </Text>
    </View>
  );
}
