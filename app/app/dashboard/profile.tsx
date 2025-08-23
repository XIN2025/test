import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Activity,
  Award,
  Bell,
  Camera,
  Check,
  Edit,
  Heart,
  HelpCircle,
  LogOut,
  Settings,
  Shield,
  Target,
  User,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Image, Platform, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileDashboard() {
  const { user } = useAuth();
  const actualEmail = user?.email || "";
  const router = useRouter();
  const { logout } = useAuth();
  console.log("Profile user:", user);
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
    profile_picture: null,
  });
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone_number: "",
    date_of_birth: "",
    blood_type: "",
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { isDarkMode, toggleDarkMode } = useTheme();
  const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

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
      const normalizedEmail = Array.isArray(actualEmail) ? actualEmail[0] : String(actualEmail || "");
      const response = await fetch(`${API_BASE_URL}/api/user/profile?email=${encodeURIComponent(normalizedEmail)}`);
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
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to fetch profile");
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const normalizedEmail = Array.isArray(actualEmail) ? actualEmail[0] : String(actualEmail || "");

      // Start with empty update data
      const updateData: Record<string, any> = {
        email: normalizedEmail,
        full_name: editForm.full_name || profile.name, // Always include full_name
      };

      let hasChanges = false;
      let changedFields: string[] = [];

      // Compare each field and track changes, adding changed fields to updateData
      if (editForm.full_name && editForm.full_name !== profile.name) {
        hasChanges = true;
        updateData.full_name = editForm.full_name;
        changedFields.push("Name");
      }

      if (editForm.blood_type !== profile.blood_type) {
        hasChanges = true;
        updateData.blood_type = editForm.blood_type;
        changedFields.push("Blood Type");
      }

      if (editForm.date_of_birth !== profile.date_of_birth) {
        hasChanges = true;
        updateData.date_of_birth = editForm.date_of_birth;
        changedFields.push("Date of Birth");
      }

      if (editForm.phone_number !== profile.phone_number) {
        hasChanges = true;
        updateData.phone_number = editForm.phone_number;
        changedFields.push("Phone Number");
      }

      if (notificationsEnabled !== profile.notifications_enabled) {
        hasChanges = true;
        updateData.notifications_enabled = notificationsEnabled;
        changedFields.push("Notifications");
      }

      if (!hasChanges) {
        Alert.alert("No Changes", "No changes were detected to update.");
        setIsEditing(false);
        return;
      }

      // Validate fields that are in updateData
      if ("blood_type" in updateData) {
        const normalizedBloodType = updateData.blood_type.toUpperCase();
        if (!/^(A|B|AB|O)[+-]$/.test(normalizedBloodType)) {
          Alert.alert("Error", "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-");
          return;
        }
        // Update with normalized value
        updateData.blood_type = normalizedBloodType;
      }

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

      console.log("Current profile:", profile);
      console.log("Edit form:", editForm);
      console.log("Fields being updated:", updateData);

      // Only make the API call if we detected any changes
      if (!hasChanges) {
        Alert.alert("No Changes", "No changes were detected to update.");
        setIsEditing(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail));
      }

      Alert.alert("Success", `Successfully updated profile`);
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Sorry, we need camera roll permissions to upload a profile picture!");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setLoading(true);
        try {
          // Create form data for the image
          const formData = new FormData();

          // Get the image from the URI
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();

          // Append the file to FormData with the correct field name
          formData.append("picture", blob, "profile-picture.jpg");

          // Upload the image
          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/user/profile/upload-picture?email=${encodeURIComponent(
              Array.isArray(actualEmail) ? actualEmail[0] : actualEmail || ""
            )}`,
            {
              method: "POST",
              body: formData,
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error("Failed to upload profile picture");
          }

          // Refresh profile to get updated picture
          await fetchProfile();
          Alert.alert("Success", "Profile picture updated successfully");
        } catch (error) {
          Alert.alert("Error", error instanceof Error ? error.message : "Failed to upload profile picture");
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to pick image");
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    try {
      setNotificationsEnabled(value);
      const normalizedEmail = Array.isArray(actualEmail) ? actualEmail[0] : String(actualEmail || "");

      const response = await fetch(`${API_BASE_URL}/api/user/profile/update`, {
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

      if (!response.ok) {
        throw new Error("Failed to update notification settings");
      }

      Alert.alert("Notifications Updated", `Push notifications have been ${value ? "enabled" : "disabled"}.`);
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

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) {
        try {
          await logout();
          router.replace("/login");
        } catch (error) {
          window.alert("Failed to sign out. Please try again.");
        }
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/login");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]);
    }
  };

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
    <SafeAreaView style={{ flex: 1 }}>
      {/* @ts-ignore - expo-linear-gradient children prop typing issue */}
      <LinearGradient
        colors={isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
            backgroundColor: isDarkMode ? "#111827" : "#ffffff",
            paddingHorizontal: 16,
            paddingVertical: 16,
            zIndex: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                }}
              >
                <User size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    marginBottom: 2,
                  }}
                >
                  Profile
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                  }}
                >
                  Manage your account
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
              }}
              activeOpacity={0.7}
            >
              <Settings size={20} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {/* Profile Card */}
            <View
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
                <View style={{ position: "relative" }}>
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                      overflow: "hidden",
                      backgroundColor: isDarkMode ? "#064e3b" : "#d1fae5",
                    }}
                  >
                    {profile.profile_picture ? (
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${profile.profile_picture}`,
                        }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={36} color={isDarkMode ? "#34d399" : "#059669"} />
                    )}
                  </View>
                  <TouchableOpacity
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 28,
                      height: 28,
                      backgroundColor: "#10b981",
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: isDarkMode ? "#1f2937" : "#ffffff",
                    }}
                    onPress={pickImage}
                    disabled={loading}
                    activeOpacity={0.7}
                  >
                    <Camera size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      marginBottom: 4,
                    }}
                  >
                    {profile.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 4,
                    }}
                  >
                    {profile.email}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#10b981", fontWeight: "600" }}>Premium Member</Text>
                </View>
                <TouchableOpacity
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
                  }}
                  onPress={() => setIsEditing(true)}
                  activeOpacity={0.7}
                >
                  <Edit size={18} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                </TouchableOpacity>
              </View>

              {/* Health Stats */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {healthStats.map((stat, index) => (
                  <View
                    key={index}
                    style={{
                      width: "48%",
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: isDarkMode ? "rgba(55, 65, 81, 0.5)" : "#f9fafb",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <stat.icon
                        size={20}
                        color={
                          isDarkMode
                            ? stat.color.includes("green")
                              ? "#34d399"
                              : stat.color.includes("blue")
                              ? "#60a5fa"
                              : stat.color.includes("purple")
                              ? "#a78bfa"
                              : "#fbbf24"
                            : stat.color.replace("text-", "").replace("-600", "")
                        }
                      />
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: isDarkMode ? "#f3f4f6" : "#1f2937",
                        }}
                      >
                        {stat.value}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      {stat.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Personal Information */}
            <View
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: isDarkMode ? "#f3f4f6" : "#1f2937",
                  }}
                >
                  Personal Information
                </Text>
                {!isEditing && (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDarkMode ? "#064e3b" : "#d1fae5",
                    }}
                    activeOpacity={0.7}
                  >
                    <Edit size={18} color={isDarkMode ? "#34d399" : "#059669"} />
                  </TouchableOpacity>
                )}
              </View>
              <View>
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Full Name
                  </Text>
                  {isEditing ? (
                    <TextInput
                      value={editForm.full_name}
                      onChangeText={(text) => setEditForm((prev) => ({ ...prev, full_name: text }))}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                        fontSize: 16,
                        borderWidth: 1,
                        borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                      }}
                      placeholder="Enter full name"
                      placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                    />
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      }}
                    >
                      {profile.name}
                    </Text>
                  )}
                </View>
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Email
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "500",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                  >
                    {profile.email}
                  </Text>
                </View>
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Phone
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        value={editForm.phone_number}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({
                            ...prev,
                            phone_number: text,
                          }))
                        }
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          color: isDarkMode ? "#f3f4f6" : "#1f2937",
                          fontSize: 16,
                          borderWidth: 1,
                          borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                          marginBottom: 6,
                        }}
                        placeholder="Enter phone number (min. 10 digits)"
                        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                        keyboardType="phone-pad"
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDarkMode ? "#6b7280" : "#6b7280",
                        }}
                      >
                        Format: +1XXXXXXXXXX or XXXXXXXXXX
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      }}
                    >
                      {profile.phone_number || "Not set"}
                    </Text>
                  )}
                </View>
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
                    marginBottom: 16,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Date of Birth
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        value={editForm.date_of_birth}
                        onChangeText={(text) =>
                          setEditForm((prev) => ({
                            ...prev,
                            date_of_birth: text,
                          }))
                        }
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          color: isDarkMode ? "#f3f4f6" : "#1f2937",
                          fontSize: 16,
                          borderWidth: 1,
                          borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                          marginBottom: 6,
                        }}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDarkMode ? "#6b7280" : "#6b7280",
                        }}
                      >
                        Format: YYYY-MM-DD (e.g., 1990-01-31)
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      }}
                    >
                      {profile.date_of_birth || "Not set"}
                    </Text>
                  )}
                </View>
                <View style={{ paddingVertical: 12 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                      marginBottom: 8,
                      fontWeight: "500",
                    }}
                  >
                    Blood Type
                  </Text>
                  {isEditing ? (
                    <>
                      <TextInput
                        value={editForm.blood_type}
                        onChangeText={(text) => {
                          setEditForm((prev) => ({
                            ...prev,
                            blood_type: text,
                          }));
                        }}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
                          color: isDarkMode ? "#f3f4f6" : "#1f2937",
                          fontSize: 16,
                          borderWidth: 1,
                          borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                          marginBottom: 6,
                        }}
                        placeholder="Enter blood type (e.g., A+)"
                        placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                        autoCapitalize="characters"
                        maxLength={3}
                      />
                      {editForm.blood_type && !/^(A|B|AB|O)[+-]$/.test(editForm.blood_type.toUpperCase()) && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#ef4444",
                            marginBottom: 4,
                          }}
                        >
                          Invalid blood type format. Please use one of: A+, A-, B+, B-, AB+, AB-, O+, O-
                        </Text>
                      )}
                      <Text
                        style={{
                          fontSize: 12,
                          color: isDarkMode ? "#6b7280" : "#6b7280",
                        }}
                      >
                        Valid formats: A+, A-, B+, B-, AB+, AB-, O+, O-
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      }}
                    >
                      {profile.blood_type || "Not set"}
                    </Text>
                  )}
                </View>
                {isEditing && (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      marginTop: 20,
                      gap: 12,
                    }}
                  >
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
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={20} color={isDarkMode ? "#9ca3af" : "#6b7280"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveProfile}
                      disabled={loading}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#10b981",
                        opacity: loading ? 0.5 : 1,
                      }}
                      activeOpacity={0.7}
                    >
                      <Check size={20} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Preferences */}
            <View
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 16,
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                }}
              >
                Preferences
              </Text>
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 20,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                        marginBottom: 4,
                      }}
                    >
                      Push Notifications
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      Receive health reminders
                    </Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{
                      false: isDarkMode ? "#374151" : "#d1d5db",
                      true: "#10b981",
                    }}
                    thumbColor="#ffffff"
                    disabled={loading}
                    style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                  />
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: isDarkMode ? "#f3f4f6" : "#1f2937",
                        marginBottom: 4,
                      }}
                    >
                      Dark Mode
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      Use dark theme
                    </Text>
                  </View>
                  <Switch
                    value={isDarkMode}
                    onValueChange={toggleDarkMode}
                    trackColor={{
                      false: isDarkMode ? "#374151" : "#d1d5db",
                      true: "#10b981",
                    }}
                    thumbColor="#ffffff"
                    style={{ transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] }}
                  />
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View
              style={{
                backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDarkMode ? 0.3 : 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  marginBottom: 16,
                  color: isDarkMode ? "#f3f4f6" : "#1f2937",
                }}
              >
                Settings
              </Text>
              <View>
                {menuItems.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      if (item.title === "Sign Out") {
                        handleLogout();
                      }
                      // Add other handlers for other menu items if needed
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor:
                        index === menuItems.length - 1
                          ? isDarkMode
                            ? "rgba(127, 29, 29, 0.5)"
                            : "#fef2f2"
                          : isDarkMode
                          ? "rgba(55, 65, 81, 0.5)"
                          : "#f9fafb",
                      marginBottom: index === menuItems.length - 1 ? 0 : 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        backgroundColor: isDarkMode ? "#4b5563" : "#e5e7eb",
                      }}
                    >
                      <item.icon
                        size={20}
                        color={
                          index === menuItems.length - 1
                            ? isDarkMode
                              ? "#f87171"
                              : "#ef4444"
                            : isDarkMode
                            ? "#9ca3af"
                            : "#6b7280"
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "500",
                          marginBottom: 2,
                          color:
                            index === menuItems.length - 1
                              ? isDarkMode
                                ? "#f87171"
                                : "#ef4444"
                              : isDarkMode
                              ? "#f3f4f6"
                              : "#1f2937",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isDarkMode ? "#9ca3af" : "#6b7280",
                        }}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* App Version */}
            <View style={{ alignItems: "center", paddingVertical: 20 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: isDarkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Evra Health App v1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
