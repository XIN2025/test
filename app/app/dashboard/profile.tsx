import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";
import { useLocalSearchParams } from "expo-router";
// @ts-ignore
import {
  Heart,
  User,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  Edit,
  Camera,
  Activity,
  Target,
  Award,
  X,
  Check,
} from "lucide-react-native";
import Card from "@/components/ui/card";
import { useUser } from "@/context/UserContext";

export default function ProfileDashboard() {
  const { userEmail: contextEmail } = useUser();
  const params = useLocalSearchParams();
  const { email } = params;
  const actualEmail = email || contextEmail;
  console.log("Profile params:", params);
  console.log("Context email:", contextEmail);
  console.log("Using email:", actualEmail);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone_number: "",
    date_of_birth: "",
    blood_type: "",
    notifications_enabled: true,
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone_number: "",
    date_of_birth: "",
    blood_type: "",
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const API_BASE_URL =
    Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    console.log("API Base URL:", API_BASE_URL);
  }, []);

  useEffect(() => {
    if (actualEmail) {
      fetchProfile();
    }
  }, [actualEmail]);

  const fetchProfile = async () => {
    try {
      const normalizedEmail = Array.isArray(actualEmail)
        ? actualEmail[0]
        : String(actualEmail || "");
      console.log("Fetching profile for email:", normalizedEmail);
      const response = await fetch(
        `${API_BASE_URL}/api/user/profile?email=${encodeURIComponent(
          normalizedEmail
        )}`
      );
      const data = await response.json();
      console.log("Profile API response:", { status: response.status, data });
      if (!response.ok) {
        throw new Error(data.detail || "Failed to fetch profile");
      }
      setProfile(data);
      setNotificationsEnabled(data.notifications_enabled);

      // Initialize edit form with current values, ensuring required fields are populated
      const newEditForm = {
        full_name: data.name || "",
        phone_number: data.phone_number || "",
        date_of_birth: data.date_of_birth || "",
        blood_type: data.blood_type || "",
      };
      setEditForm(newEditForm);
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to fetch profile"
      );
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const normalizedEmail = Array.isArray(actualEmail)
        ? actualEmail[0]
        : String(actualEmail || "");
      console.log("Saving profile for email:", normalizedEmail);

      // Start with the required fields
      const updateData: Record<string, any> = {
        email: normalizedEmail,
        full_name: editForm.full_name || profile.name, // Always include full_name
      };

      // Add optional fields only if they're different from current values
      if (editForm.phone_number !== profile.phone_number) {
        updateData.phone_number = editForm.phone_number || null;
      }
      if (editForm.date_of_birth !== profile.date_of_birth) {
        updateData.date_of_birth = editForm.date_of_birth || null;
      }
      if (editForm.blood_type !== profile.blood_type) {
        updateData.blood_type = editForm.blood_type || null;
      }

      // Only include notifications if they've changed
      if (notificationsEnabled !== profile.notifications_enabled) {
        updateData.notifications_enabled = notificationsEnabled;
      }

      updateData.notifications_enabled = notificationsEnabled;

      // Only validate fields that are being updated and have values
      if ("phone_number" in updateData && updateData.phone_number) {
        if (!/^\+?1?\d{10,14}$/.test(updateData.phone_number)) {
          Alert.alert("Error", "Phone number must be at least 10 digits");
          return;
        }
      }

      if ("date_of_birth" in updateData && updateData.date_of_birth) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(updateData.date_of_birth)) {
          Alert.alert("Error", "Date of birth must be in YYYY-MM-DD format");
          return;
        }
      }

      if ("blood_type" in updateData && updateData.blood_type) {
        if (!/^(A|B|AB|O)[+-]$/.test(updateData.blood_type)) {
          Alert.alert(
            "Error",
            "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-"
          );
          return;
        }
      }

      console.log("Current profile:", profile);
      console.log("Edit form:", editForm);
      console.log("Fields being updated:", updateData);
      
      // Only proceed if there are actual changes beyond the required fields
      const hasChanges = Object.keys(updateData).length > 2 || // More than email and full_name
                        editForm.full_name !== profile.name; // Or full_name has changed
      
      if (!hasChanges) {
        console.log("No changes detected, skipping update");
        setIsEditing(false);
        return;
      }

      console.log("Attempting to update profile with data:", updateData);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/user/profile/update`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }
        );

        console.log("Profile update response status:", response.status);
        const data = await response.json();
        console.log("Profile update response data:", data);

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail)
          );
        }

        Alert.alert("Success", "Profile updated successfully");
        setIsEditing(false);
        fetchProfile();
      } catch (error) {
        console.error("Error during fetch:", error);
        throw error;
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      const normalizedEmail = Array.isArray(actualEmail)
        ? actualEmail[0]
        : String(actualEmail || "");
      console.log("Updating notifications for email:", normalizedEmail);
      await fetch(`${API_BASE_URL}/api/user/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          ...editForm,
          notifications_enabled: value,
        }),
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update notification settings");
      setNotificationsEnabled(!value);
    }
  };

  const healthStats = [
    {
      label: "Health Score",
      value: "85",
      icon: Heart,
      color: "text-green-700",
    },
    {
      label: "Days Active",
      value: "23",
      icon: Activity,
      color: "text-blue-600",
    },
    {
      label: "Goals Met",
      value: "8/10",
      icon: Target,
      color: "text-purple-600",
    },
    {
      label: "Achievements",
      value: "12",
      icon: Award,
      color: "text-amber-600",
    },
  ];

  const menuItems = [
    {
      icon: Settings,
      title: "Account Settings",
      subtitle: "Manage your account",
    },
    { icon: Bell, title: "Notifications", subtitle: "Configure notifications" },
    {
      icon: Shield,
      title: "Privacy & Security",
      subtitle: "Manage your privacy",
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help and contact us",
    },
    { icon: LogOut, title: "Sign Out", subtitle: "Sign out of your account" },
  ];

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4 z-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#114131" }}
              >
                <User size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">Profile</Text>
                <Text className="text-sm text-gray-600">
                  Manage your account
                </Text>
              </View>
            </View>
            <TouchableOpacity className="p-2">
              <Settings size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <View className="px-4 space-y-6 mt-4">
            {/* Profile Card */}
            <Card className="border-0">
              <View className="p-6">
                <View className="flex-row items-center mb-4">
                  <View className="relative">
                    <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mr-4">
                      <User size={32} color="#059669" />
                    </View>
                    <TouchableOpacity className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-600 rounded-full items-center justify-center">
                      <Camera size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xl font-bold text-gray-800">
                      {profile.name}
                    </Text>
                    <Text className="text-gray-600">{profile.email}</Text>
                    <Text className="text-sm text-emerald-600">
                      Premium Member
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => setIsEditing(true)}
                  >
                    <Edit size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Health Stats */}
                <View className="grid grid-cols-2 gap-3">
                  {healthStats.map((stat, index) => (
                    <View key={index} className="bg-gray-50 p-3 rounded-lg">
                      <View className="flex-row items-center justify-between mb-1">
                        <stat.icon
                          size={16}
                          color={stat.color
                            .replace("text-", "")
                            .replace("-600", "")}
                        />
                        <Text className="text-lg font-bold text-gray-800">
                          {stat.value}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-600">
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>

            {/* Personal Information */}
            <Card className="border-0">
              <View className="p-4">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-lg font-semibold text-gray-800">
                    Personal Information
                  </Text>
                  {!isEditing && (
                    <TouchableOpacity
                      onPress={() => setIsEditing(true)}
                      className="bg-emerald-100 p-2 rounded-full"
                    >
                      <Edit size={16} color="#059669" />
                    </TouchableOpacity>
                  )}
                </View>
                <View className="space-y-3">
                  <View className="py-2 border-b border-gray-100">
                    <Text className="text-gray-600 mb-1">Full Name</Text>
                    {isEditing ? (
                      <TextInput
                        value={editForm.full_name}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({ ...prev, full_name: text }))
                        }
                        className="bg-gray-50 p-2 rounded-md"
                        placeholder="Enter full name"
                      />
                    ) : (
                      <Text className="font-medium text-gray-800">
                        {profile.name}
                      </Text>
                    )}
                  </View>
                  <View className="py-2 border-b border-gray-100">
                    <Text className="text-gray-600 mb-1">Email</Text>
                    <Text className="font-medium text-gray-800">
                      {profile.email}
                    </Text>
                  </View>
                  <View className="py-2 border-b border-gray-100">
                    <Text className="text-gray-600 mb-1">Phone</Text>
                    {isEditing ? (
                      <TextInput
                        value={editForm.phone_number}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({
                            ...prev,
                            phone_number: text,
                          }))
                        }
                        className="bg-gray-50 p-2 rounded-md"
                        placeholder="Enter phone number (min. 10 digits)"
                        keyboardType="phone-pad"
                      />
                    ) : (
                      <Text className="font-medium text-gray-800">
                        {profile.phone_number || "Not set"}
                      </Text>
                    )}
                    {isEditing && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Format: +1XXXXXXXXXX or XXXXXXXXXX
                      </Text>
                    )}
                  </View>
                  <View className="py-2 border-b border-gray-100">
                    <Text className="text-gray-600 mb-1">Date of Birth</Text>
                    {isEditing ? (
                      <TextInput
                        value={editForm.date_of_birth}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({
                            ...prev,
                            date_of_birth: text,
                          }))
                        }
                        className="bg-gray-50 p-2 rounded-md"
                        placeholder="YYYY-MM-DD"
                      />
                    ) : (
                      <Text className="font-medium text-gray-800">
                        {profile.date_of_birth || "Not set"}
                      </Text>
                    )}
                    {isEditing && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Format: YYYY-MM-DD (e.g., 1990-01-31)
                      </Text>
                    )}
                  </View>
                  <View className="py-2">
                    <Text className="text-gray-600 mb-1">Blood Type</Text>
                    {isEditing ? (
                      <TextInput
                        value={editForm.blood_type}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({ ...prev, blood_type: text }))
                        }
                        className="bg-gray-50 p-2 rounded-md"
                        placeholder="Enter blood type (e.g., A+)"
                      />
                    ) : (
                      <Text className="font-medium text-gray-800">
                        {profile.blood_type || "Not set"}
                      </Text>
                    )}
                    {isEditing && (
                      <Text className="text-xs text-gray-500 mt-1">
                        Valid formats: A+, A-, B+, B-, AB+, AB-, O+, O-
                      </Text>
                    )}
                  </View>
                  {isEditing && (
                    <View className="flex-row justify-end space-x-2 mt-4">
                      <TouchableOpacity
                        onPress={() => {
                          setIsEditing(false);
                          setEditForm({
                            full_name: profile.name,
                            phone_number: profile.phone_number || "",
                            date_of_birth: profile.date_of_birth || "",
                            blood_type: profile.blood_type || "",
                          });
                        }}
                        className="bg-gray-100 px-4 py-2 rounded-lg"
                      >
                        <X size={20} color="#64748b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveProfile}
                        disabled={loading}
                        className="bg-emerald-600 px-4 py-2 rounded-lg"
                      >
                        <Check size={20} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </Card>

            {/* Preferences */}
            <Card className="border-0">
              <View className="p-4">
                <Text className="text-lg font-semibold text-gray-800 mb-4">
                  Preferences
                </Text>
                <View className="space-y-4">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="font-medium text-gray-800">
                        Push Notifications
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Receive health reminders
                      </Text>
                    </View>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={handleNotificationToggle}
                      trackColor={{ false: "#d1d5db", true: "#10b981" }}
                      thumbColor="#ffffff"
                      disabled={loading}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="font-medium text-gray-800">
                        Dark Mode
                      </Text>
                      <Text className="text-sm text-gray-600">
                        Use dark theme
                      </Text>
                    </View>
                    <Switch
                      value={darkModeEnabled}
                      onValueChange={setDarkModeEnabled}
                      trackColor={{ false: "#d1d5db", true: "#10b981" }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>
              </View>
            </Card>

            {/* Menu Items */}
            <Card className="border-0">
              <View className="p-4">
                <Text className="text-lg font-semibold text-gray-800 mb-4">
                  Settings
                </Text>
                <View className="space-y-1">
                  {menuItems.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      className={`flex-row items-center p-3 rounded-lg ${
                        index === menuItems.length - 1
                          ? "bg-red-50"
                          : "bg-gray-50"
                      }`}
                    >
                      <item.icon
                        size={20}
                        color={
                          index === menuItems.length - 1 ? "#ef4444" : "#64748b"
                        }
                        className="mr-3"
                      />
                      <View className="flex-1">
                        <Text
                          className={`font-medium ${
                            index === menuItems.length - 1
                              ? "text-red-600"
                              : "text-gray-800"
                          }`}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {item.subtitle}
                        </Text>
                      </View>
                      {/* ArrowRight icon is not imported, so it's commented out */}
                      {/* <ArrowRight size={16} color="#64748b" /> */}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>

            {/* App Version */}
            <View className="items-center py-4">
              <Text className="text-sm text-gray-500">
                Evra Health App v1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
