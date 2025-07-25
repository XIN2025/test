"use client"
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "../contexts/AuthContext"

const DashboardScreen = () => {
  const { user } = useAuth()

  const healthMetrics = [
    {
      title: "Heart Rate",
      value: "72",
      unit: "bpm",
      icon: "heart",
      color: "#EF4444",
      trend: "+2%",
      trendUp: true,
    },
    {
      title: "Steps Today",
      value: "8,432",
      unit: "steps",
      icon: "walk",
      color: "#3B82F6",
      trend: "+15%",
      trendUp: true,
      progress: 84,
    },
    {
      title: "Hydration",
      value: "6.2",
      unit: "L",
      icon: "water",
      color: "#06B6D4",
      trend: "-5%",
      trendUp: false,
      progress: 62,
    },
    {
      title: "Sleep Quality",
      value: "7.5",
      unit: "hrs",
      icon: "moon",
      color: "#8B5CF6",
      trend: "+8%",
      trendUp: true,
      progress: 94,
    },
  ]

  const quickActions = [
    {
      title: "Chat with AI Coach",
      description: "Get health advice",
      icon: "chatbubble",
      color: "#10B981",
    },
    {
      title: "Book Appointment",
      description: "Schedule with doctor",
      icon: "calendar",
      color: "#3B82F6",
    },
    {
      title: "Log Medication",
      description: "Track your pills",
      icon: "medical",
      color: "#8B5CF6",
    },
    {
      title: "Upload Document",
      description: "Add health records",
      icon: "document-text",
      color: "#F59E0B",
    },
  ]

  const recentActivity = [
    {
      id: 1,
      type: "exercise",
      title: "Morning Run",
      description: "5.2 km in 28 minutes",
      time: "2 hours ago",
      icon: "fitness",
      color: "#3B82F6",
    },
    {
      id: 2,
      type: "medication",
      title: "Medication Taken",
      description: "Vitamin D supplement",
      time: "4 hours ago",
      icon: "medical",
      color: "#10B981",
    },
    {
      id: 3,
      type: "vitals",
      title: "Blood Pressure Reading",
      description: "120/80 mmHg - Normal",
      time: "6 hours ago",
      icon: "heart",
      color: "#EF4444",
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, {user?.name?.split(" ")[0]}!</Text>
            <Text style={styles.subGreeting}>Here's your health overview for today</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Health Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Metrics</Text>
          <View style={styles.metricsGrid}>
            {healthMetrics.map((metric, index) => (
              <View key={index} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricTitle}>{metric.title}</Text>
                  <View style={[styles.metricIcon, { backgroundColor: `${metric.color}20` }]}>
                    <Ionicons name={metric.icon as any} size={20} color={metric.color} />
                  </View>
                </View>
                <View style={styles.metricValue}>
                  <Text style={styles.metricNumber}>{metric.value}</Text>
                  <Text style={styles.metricUnit}>{metric.unit}</Text>
                </View>
                <View style={styles.metricTrend}>
                  <View style={styles.trendContainer}>
                    <Ionicons
                      name={metric.trendUp ? "trending-up" : "trending-down"}
                      size={12}
                      color={metric.trendUp ? "#10B981" : "#EF4444"}
                    />
                    <Text style={[styles.trendText, { color: metric.trendUp ? "#10B981" : "#EF4444" }]}>
                      {metric.trend}
                    </Text>
                  </View>
                  <Text style={styles.trendLabel}>vs yesterday</Text>
                </View>
                {metric.progress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${metric.progress}%`, backgroundColor: metric.color }]}
                      />
                    </View>
                    <Text style={styles.progressText}>{metric.progress}% of daily goal</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <TouchableOpacity key={index} style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                  <Ionicons name={action.icon as any} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityList}>
            {recentActivity.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
                  <Ionicons name={activity.icon as any} size={20} color={activity.color} />
                </View>
                <View style={styles.activityContent}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
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
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subGreeting: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  notificationButton: {
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
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  metricTitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  metricUnit: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  metricTrend: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  trendLabel: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  activityList: {
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
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  activityTime: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  activityDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
})

export default DashboardScreen
