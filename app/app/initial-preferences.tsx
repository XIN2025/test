import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import EvraLogo from "../components/EvraLogo";
import { validateAge, validateGender } from "../utils/validation";
import { userApi, handleApiError } from "../utils/api";

// TypeScript interfaces
interface PreferencesFormData {
  age: string;
  gender: string;
  healthGoals: string[];
  conditions: string[];
  communicationStyle: string;
  notifications: boolean;
}

interface PreferencesErrors {
  age?: string;
  gender?: string;
  communicationStyle?: string;
}

const healthGoalsList = [
  "Better Energy",
  "Better Focus / Performance",
  "Reverse Chronic Disease",
  "Prevent Chronic Disease",
  "Social Connection",
  "Mindfulness",
];

const conditionsList = [
  "Type 2 Diabetes / Insulin Resistance",
  "Cardiovascular Disease",
  "Cancer",
  "Digestive / Gut Issues",
  "Depression",
  "Anxiety",
  "PCOS",
  "Hormonal Dysregulation (Menopause / Andropause)",
  "ADHD",
  "Chronic Pain",
  "Auto-Immune / Inflammation Related Fatigue",
];

const communicationStyles = ["Formal", "Friendly", "Concise", "Detailed"];

export default function InitialPreferences() {
  const { email } = useLocalSearchParams();
  const router = useRouter();

  const [formData, setFormData] = useState<PreferencesFormData>({
    age: "",
    gender: "",
    healthGoals: [],
    conditions: [],
    communicationStyle: "",
    notifications: false,
  });

  const [errors, setErrors] = useState<PreferencesErrors>({});
  const [loading, setLoading] = useState(false);

  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: PreferencesErrors = {};

    const ageResult = validateAge(formData.age);
    if (!ageResult.isValid) {
      newErrors.age = ageResult.error;
    }

    const genderResult = validateGender(formData.gender);
    if (!genderResult.isValid) {
      newErrors.gender = genderResult.error;
    }

    if (!formData.communicationStyle.trim()) {
      newErrors.communicationStyle = "Communication style is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (
    field: keyof PreferencesFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof PreferencesErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const toggleSelection = (
    item: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const preferences = {
        email,
        age: Number(formData.age) || 0,
        gender: formData.gender || "",
        healthGoals: formData.healthGoals,
        conditions: formData.conditions,
        communicationStyle: formData.communicationStyle || "",
        notifications: formData.notifications,
      };

      await userApi.savePreferences(preferences);

      console.log("Success! Navigating to dashboard...");
      router.push("./dashboard/main");
    } catch (err) {
      const errorMessage = handleApiError(err);
      Alert.alert("Failed to save preferences.", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.age.trim().length > 0 &&
    formData.gender.trim().length > 0 &&
    formData.communicationStyle.trim().length > 0 &&
    Object.keys(errors).length === 0;

  return (
    <View className="flex-1 bg-green-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-4">
        {/* Logo */}
        <View className="items-center mb-8 mt-8">
          <EvraLogo size={64} className="mb-4" />
          <Text className="text-3xl font-bold" style={{ color: "#059669" }}>
            Evra
          </Text>
          <Text className="mt-1" style={{ color: "#059669" }}>
            Your Agent for Better Health
          </Text>
        </View>

        {/* Card */}
        <View className="bg-white w-full rounded-xl shadow-lg p-8 mb-8">
          <Text className="text-2xl font-bold mb-2 text-center">
            Tell us about yourself
          </Text>
          <Text className="text-gray-500 mb-6 text-center">
            Help us personalize your health experience
          </Text>

          {/* Age Input */}
          <View className="w-full mb-4">
            <Text className="mb-1 text-gray-700">Age *</Text>
            <TextInput
              className={`border rounded-md px-4 py-3 w-full text-base bg-gray-50 ${
                errors.age ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your age"
              value={formData.age}
              onChangeText={(value) => handleInputChange("age", value)}
              keyboardType="numeric"
              editable={!loading}
              autoComplete="off"
            />
            {errors.age && (
              <Text className="text-red-500 text-sm mt-1">{errors.age}</Text>
            )}
          </View>

          {/* Gender Input */}
          <View className="w-full mb-4">
            <Text className="mb-1 text-gray-700">Gender *</Text>
            <TextInput
              className={`border rounded-md px-4 py-3 w-full text-base bg-gray-50 ${
                errors.gender ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your gender"
              value={formData.gender}
              onChangeText={(value) => handleInputChange("gender", value)}
              editable={!loading}
              autoComplete="off"
            />
            {errors.gender && (
              <Text className="text-red-500 text-sm mt-1">{errors.gender}</Text>
            )}
          </View>

          {/* Health Goals */}
          <View className="w-full mb-4">
            <Text className="mb-2 text-gray-700 font-medium">Health Goals</Text>
            <View className="flex-row flex-wrap gap-2">
              {healthGoalsList.map((goal) => (
                <TouchableOpacity
                  key={goal}
                  className={`px-3 py-2 rounded-full border ${
                    formData.healthGoals.includes(goal)
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor: formData.healthGoals.includes(goal)
                      ? "#059669"
                      : "#f3f4f6",
                    borderColor: formData.healthGoals.includes(goal)
                      ? "#059669"
                      : "#d1d5db",
                  }}
                  onPress={() =>
                    toggleSelection(goal, formData.healthGoals, (newGoals) =>
                      handleInputChange("healthGoals", newGoals)
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.healthGoals.includes(goal)
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {goal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Existing Conditions */}
          <View className="w-full mb-4">
            <Text className="mb-2 text-gray-700 font-medium">
              Existing Conditions
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {conditionsList.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  className={`px-3 py-2 rounded-full border ${
                    formData.conditions.includes(cond)
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor: formData.conditions.includes(cond)
                      ? "#059669"
                      : "#f3f4f6",
                    borderColor: formData.conditions.includes(cond)
                      ? "#059669"
                      : "#d1d5db",
                  }}
                  onPress={() =>
                    toggleSelection(
                      cond,
                      formData.conditions,
                      (newConditions) =>
                        handleInputChange("conditions", newConditions)
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.conditions.includes(cond)
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {cond}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Communication Style */}
          <View className="w-full mb-4">
            <Text className="mb-2 text-gray-700 font-medium">
              Preferred Communication Style *
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {communicationStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  className={`px-3 py-2 rounded-full border ${
                    formData.communicationStyle === style
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor:
                      formData.communicationStyle === style
                        ? "#059669"
                        : "#f3f4f6",
                    borderColor:
                      formData.communicationStyle === style
                        ? "#059669"
                        : "#d1d5db",
                  }}
                  onPress={() => handleInputChange("communicationStyle", style)}
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.communicationStyle === style
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.communicationStyle && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.communicationStyle}
              </Text>
            )}
          </View>

          {/* Notifications */}
          <View className="w-full mb-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-700 font-medium">
                Enable Notifications
              </Text>
              <TouchableOpacity
                className={`px-3 py-2 rounded-full border ${
                  formData.notifications
                    ? "border-gray-300"
                    : "bg-gray-100 border-gray-300"
                }`}
                style={{
                  backgroundColor: formData.notifications
                    ? "#059669"
                    : "#f3f4f6",
                  borderColor: formData.notifications ? "#059669" : "#d1d5db",
                }}
                onPress={() =>
                  handleInputChange("notifications", !formData.notifications)
                }
                disabled={loading}
              >
                <Text
                  className={`text-sm font-medium ${
                    formData.notifications ? "text-white" : "text-gray-700"
                  }`}
                >
                  {formData.notifications ? "Yes" : "No"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className={`rounded-md w-full py-3 mt-2 mb-2 items-center ${
              !isFormValid || loading ? "opacity-50" : ""
            }`}
            style={{ backgroundColor: loading ? "#9ca3af" : "#059669" }}
            onPress={handleSubmit}
            disabled={!isFormValid || loading}
          >
            <Text className="text-white text-lg font-semibold">
              {loading ? "Saving..." : "Save Preferences"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
