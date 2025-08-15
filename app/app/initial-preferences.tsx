import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
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
  atRiskConditions: string[];
  tonalStyle: string;
  verbosityStyle: string;
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
  "High Cholesterol",
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

const tonalStyles = ["Formal", "Friendly"];
const verbosityStyles = ["Concise", "Detailed"];

const genderOptions = ["Male", "Female", "Other"];

export default function InitialPreferences() {
  const { email } = useLocalSearchParams();
  const router = useRouter();

  const [formData, setFormData] = useState<PreferencesFormData>({
    age: "",
    gender: "",
    healthGoals: [],
    conditions: [],
    atRiskConditions: [],
    tonalStyle: "",
    verbosityStyle: "",
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

    if (!formData.tonalStyle.trim()) {
      newErrors.communicationStyle =
        "Please select a tone (Formal or Friendly)";
    }
    if (!formData.verbosityStyle.trim()) {
      newErrors.communicationStyle =
        "Please select a style (Concise or Detailed)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (
    field: keyof PreferencesFormData,
    value: string | boolean | string[]
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
    apply: (newList: string[]) => void
  ) => {
    if (list.includes(item)) {
      apply(list.filter((i) => i !== item));
    } else {
      apply([...list, item]);
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
        atRiskConditions: formData.atRiskConditions,
        communicationStyle: [formData.tonalStyle, formData.verbosityStyle]
          .filter(Boolean)
          .join(" - "),
        notifications: formData.notifications,
      };

      await userApi.savePreferences(preferences);

      console.log("Success! Navigating to dashboard...");
      const normalizedEmail = Array.isArray(email)
        ? email[0]
        : String(email || "");
      router.push({
        pathname: "./dashboard/main",
        params: { email: normalizedEmail },
      });
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
    formData.tonalStyle.trim().length > 0 &&
    formData.verbosityStyle.trim().length > 0 &&
    Object.keys(errors).length === 0;

  return (
    <View className="flex-1 bg-green-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-4">
        {/* Logo */}
        <View className="items-center mb-8 mt-8">
          <View style={{ marginBottom: 16 }}>
            <EvraLogo size={64} />
          </View>
          <Text
            className="text-3xl font-bold"
            style={{ color: "#114131", fontFamily: "SourceSansPro" }}
          >
            Evra
          </Text>
          <Text
            className="mt-1"
            style={{ color: "#114131", fontFamily: "Evra" }}
          >
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
              onChangeText={(value) => {
                // Only allow numbers and limit to reasonable age values
                const numValue = value.replace(/[^0-9]/g, "");
                if (
                  numValue === "" ||
                  (parseInt(numValue) >= 0 && parseInt(numValue) <= 120)
                ) {
                  handleInputChange("age", numValue);
                }
              }}
              keyboardType="numeric"
              maxLength={3}
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
            <View
              className={`border rounded-md overflow-hidden ${
                errors.gender ? "border-red-500" : "border-gray-300"
              }`}
            >
              <Picker
                selectedValue={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
                enabled={!loading}
                style={{ backgroundColor: "#F9FAFB", height: 50 }}
              >
                <Picker.Item label="Select gender" value="" />
                {genderOptions.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
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

          {/* At Risk Conditions */}
          <View className="w-full mb-4">
            <Text className="mb-2 text-gray-700 font-medium">
              At Risk Conditions
            </Text>
            <Text className="text-gray-500 text-sm mb-2">
              Conditions you want to prevent
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {conditionsList.map((cond) => (
                <TouchableOpacity
                  key={cond}
                  className={`px-3 py-2 rounded-full border ${
                    formData.atRiskConditions.includes(cond)
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor: formData.atRiskConditions.includes(cond)
                      ? "#059669"
                      : "#f3f4f6",
                    borderColor: formData.atRiskConditions.includes(cond)
                      ? "#059669"
                      : "#d1d5db",
                  }}
                  onPress={() =>
                    toggleSelection(
                      cond,
                      formData.atRiskConditions,
                      (newAtRiskConditions) =>
                        handleInputChange(
                          "atRiskConditions",
                          newAtRiskConditions
                        )
                    )
                  }
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.atRiskConditions.includes(cond)
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

            {/* Tone Selection */}
            <Text className="text-sm text-gray-600 mb-2">Tone</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {tonalStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  className={`px-3 py-2 rounded-full border ${
                    formData.tonalStyle === style
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor:
                      formData.tonalStyle === style ? "#059669" : "#f3f4f6",
                    borderColor:
                      formData.tonalStyle === style ? "#059669" : "#d1d5db",
                  }}
                  onPress={() => handleInputChange("tonalStyle", style)}
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.tonalStyle === style
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Verbosity Selection */}
            <Text className="text-sm text-gray-600 mb-2">Detail Level</Text>
            <View className="flex-row flex-wrap gap-2">
              {verbosityStyles.map((style) => (
                <TouchableOpacity
                  key={style}
                  className={`px-3 py-2 rounded-full border ${
                    formData.verbosityStyle === style
                      ? "border-gray-300"
                      : "bg-gray-100 border-gray-300"
                  }`}
                  style={{
                    backgroundColor:
                      formData.verbosityStyle === style ? "#059669" : "#f3f4f6",
                    borderColor:
                      formData.verbosityStyle === style ? "#059669" : "#d1d5db",
                  }}
                  onPress={() => handleInputChange("verbosityStyle", style)}
                  disabled={loading}
                >
                  <Text
                    className={`text-sm font-medium ${
                      formData.verbosityStyle === style
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
