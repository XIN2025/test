"use client"

import React from "react"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Switch } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../contexts/AuthContext"

const SettingsScreen = () => {
  const { user, logout } = useAuth()
  const [notifications, setNotifications] = React.useState(true)
  const [biometrics, setBiometrics] = React.useState(false)
  const [dataSharing, setDataSharing] = React.useState(true)

  const settingsOptions = [
    {
      title: "Profile",
      subtitle: "Edit your personal information",
      icon: "person-outline",
      onPress: () => {},
    },
    {
      title: "Health Preferences",
      subtitle: "Update your health goals and preferences",
      icon: "heart-outline",
      onPress: () => {},
    },
    {
      title: "Privacy & Security",
      subtitle: "Manage your privacy settings",
      icon: "shield-outline",
      onPress: () => {},
    },
    {
      title: "Connected Devices",
      subtitle: "Manage smartwatch and health devices",
      icon: "watch-outline",
      onPress: () => {},
    },
    {
      title: "Emergency Contacts",
      subtitle: "Update emergency contact information",
      icon: "call-outline",
      onPress: () => {},
    },
    {
      title: "Help & Support",
      subtitle: "Get help and contact support",
      icon: "help-circle-outline",
      onPress: () => {},
    },
    {
      title: "About",
      subtitle: "App version and legal information",
      icon: "information-circle-outline",
      onPress: () => {},
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || "U"}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user?.name || "User"}</Text>
              <Text style={styles.userEmail}>{user?.email || "user@example.com"}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="pencil" size={16} color="#10B981" />
          </TouchableOpacity>
        </View>

        {/* Quick Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Settings</Text>
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={20} color="#6B7280" />
                <Text style={styles.settingTitle}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor={notifications ? "#ffffff" : "#ffffff"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="finger-print-outline" size={20} color="#6B7280" />
                <Text style={styles.settingTitle}>Biometric Login</Text>
              </View>
              <Switch
                value={biometrics}
                onValueChange={setBiometrics}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor={biometrics ? "#ffffff" : "#ffffff"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="share-outline" size={20} color="#6B7280" />
                <Text style={styles.settingTitle}>Health Data Sharing</Text>
              </View>
              <Switch
                value={dataSharing}
                onValueChange={setDataSharing}
                trackColor={{ false: "#E5E7EB", true: "#10B981" }}
                thumbColor={dataSharing ? "#ffffff" : "#ffffff"}
              />
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsList}>
            {settingsOptions.map((option, index) => (
              <TouchableOpacity key={index} style={styles.settingOption} onPress={option.onPress}>
                <View style={styles.settingLeft}>
                  <Ionicons name={option.icon as any} size={20} color="#6B7280" />
                  <View>
                    <Text style={styles.settingTitle}>{option.title}</Text>
                    <Text style={styles.settingSubtitle}>{option.subtitle}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Evra Health v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  profileSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: 1,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  settingsList: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginLeft: 12,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 24,
  },
})

export default SettingsScreen
