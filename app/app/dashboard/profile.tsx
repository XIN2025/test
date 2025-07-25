import React from "react";
import { View, Text } from "react-native";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import { Heart, User } from "lucide-react-native";
// @ts-ignore
import { Card } from "@/components/ui/card";
// @ts-ignore
import { tw } from "nativewind";

export default function ProfileDashboard() {
  return (
    <LinearGradient
      colors={["#ecfdf5", "#f0fdfa"]}
      style={tw`flex-1`}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={tw`px-4 pt-12`}>
        {" "}
        {/* Header */}
        <View style={tw`flex-row items-center mb-6`}>
          <View
            style={tw`w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3`}
          >
            <Heart size={20} color="#fff" />
          </View>
          <View>
            <Text style={tw`font-semibold text-gray-800`}>
              Good morning, John!
            </Text>
            <Text style={tw`text-sm text-gray-600`}>
              Ready for a healthy day?
            </Text>
          </View>
        </View>
        {/* Profile Card */}
        <Card className="border-0">
          <View style={tw`flex-row items-center p-6`}>
            <View
              style={tw`w-16 h-16 bg-emerald-100 rounded-full items-center justify-center mr-4`}
            >
              <User size={32} color="#059669" />
            </View>
            <View>
              <Text style={tw`text-lg font-bold text-gray-800`}>John Doe</Text>
              <Text style={tw`text-gray-600`}>john.doe@example.com</Text>
            </View>
          </View>
        </Card>
      </View>
    </LinearGradient>
  );
}
