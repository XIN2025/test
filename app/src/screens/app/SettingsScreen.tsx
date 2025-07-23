import { View, Text } from "react-native";
import React from "react";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../stores/auth.store";

const SettingsScreen = () => {
  const { user, logout, isLoading } = useAuthStore();

  return (
    <View className="flex-1 bg-white p-6">
      <View className="mb-8">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Settings</Text>
        <Text className="text-gray-600">Manage your account</Text>
      </View>

      {/* User Info Section */}
      <View className="bg-gray-50 rounded-lg p-4 mb-6">
        <Text className="text-sm text-gray-500 mb-1">Account Info</Text>
        <Text className="text-gray-900 font-medium mb-1">{user?.name}</Text>
        <Text className="text-gray-600">{user?.email}</Text>
      </View>

      {/* Demo Info */}
      <View className="bg-blue-50 rounded-lg p-4 mb-6">
        <Text className="text-blue-900 font-medium mb-1">Demo Account</Text>
        <Text className="text-blue-700 text-sm">
          This is a demo implementation using local storage for authentication.
        </Text>
      </View>

      {/* Actions */}
      <View className="mt-auto">
        <Button
          title="Logout"
          onPress={logout}
          loading={isLoading}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
};

export default SettingsScreen;
