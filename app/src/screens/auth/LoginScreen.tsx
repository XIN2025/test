import React from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useAuthStore } from "../../stores/auth.store";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LoginFormData } from "../../types/auth.types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "Login">;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = React.useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<Partial<LoginFormData>>({});
  const { login, isLoading, error } = useAuthStore();

  const validateForm = () => {
    const newErrors: Partial<LoginFormData> = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(formData.email, formData.password);
    } catch (err) {
      Alert.alert("Error", error || "An error occurred");
    }
  };

  return (
    <ScrollView
      contentContainerClassName="flex-grow"
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-1 p-6 bg-white">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to OpenGig
          </Text>
          <Text className="text-gray-600">Sign in to continue</Text>
        </View>

        <Input
          label="Email"
          placeholder="demo@opengig.work"
          keyboardType="email-address"
          autoCapitalize="none"
          value={formData.email}
          onChangeText={(text) => {
            setFormData((prev) => ({ ...prev, email: text }));
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          showPasswordToggle
          value={formData.password}
          onChangeText={(text) => {
            setFormData((prev) => ({ ...prev, password: text }));
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
        />

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
          className="mt-6"
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Don't have an account? </Text>
          <Text
            className="text-blue-500 font-medium"
            onPress={() => navigation.navigate("Signup")}
          >
            Sign Up
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
