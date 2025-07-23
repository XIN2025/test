import React from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useAuthStore } from "../../stores/auth.store";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SignupFormData } from "../../types/auth.types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<any, "Signup">;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = React.useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [errors, setErrors] = React.useState<Partial<SignupFormData>>({});
  const { signup, isLoading, error } = useAuthStore();

  const validateForm = () => {
    const newErrors: Partial<SignupFormData> = {};

    if (!formData.name) {
      newErrors.name = "Name is required";
    }

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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      await signup(formData.email, formData.password, formData.name);
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
            Create Account
          </Text>
          <Text className="text-gray-600">Sign up to get started</Text>
        </View>

        <Input
          label="Name"
          placeholder="Enter your name"
          value={formData.name}
          onChangeText={(text) => {
            setFormData((prev) => ({ ...prev, name: text }));
            setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        <Input
          label="Email"
          placeholder="Enter your email"
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

        <Input
          label="Confirm Password"
          placeholder="Confirm your password"
          secureTextEntry
          showPasswordToggle
          value={formData.confirmPassword}
          onChangeText={(text) => {
            setFormData((prev) => ({ ...prev, confirmPassword: text }));
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
        />

        <Button
          title="Sign Up"
          onPress={handleSignup}
          loading={isLoading}
          fullWidth
          className="mt-6"
        />

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-600">Already have an account? </Text>
          <Text
            className="text-blue-500 font-medium"
            onPress={() => navigation.navigate("Login")}
          >
            Sign In
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};
