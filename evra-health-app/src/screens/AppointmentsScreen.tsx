import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"

const AppointmentsScreen = () => {
  const upcomingAppointments = [
    {
      id: 1,
      doctor: "Dr. Sarah Johnson",
      specialty: "Cardiologist",
      date: "Tomorrow",
      time: "10:30 AM",
      type: "in-person",
      location: "Medical Center",
      avatar: "medical",
    },
    {
      id: 2,
      doctor: "Dr. Michael Chen",
      specialty: "General Practitioner",
      date: "Friday",
      time: "2:00 PM",
      type: "video",
      location: "Video Call",
      avatar: "videocam",
    },
  ]

  const pastAppointments = [
    {
      id: 3,
      doctor: "Dr. Emily Davis",
      specialty: "Dermatologist",
      date: "Last Monday",
      time: "11:00 AM",
      type: "completed",
      location: "Skin Care Clinic",
    },
    {
      id: 4,
      doctor: "Dr. Robert Wilson",
      specialty: "Orthopedist",
      date: "2 weeks ago",
      time: "3:30 PM",
      type: "completed",
      location: "Bone & Joint Center",
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Appointments</Text>
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <View style={styles.appointmentsList}>
            {upcomingAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.doctorInfo}>
                    <View style={styles.doctorAvatar}>
                      <Ionicons name={appointment.avatar as any} size={24} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.doctorName}>{appointment.doctor}</Text>
                      <Text style={styles.specialty}>{appointment.specialty}</Text>
                    </View>
                  </View>
                  <View style={styles.appointmentType}>
                    <Ionicons name={appointment.type === "video" ? "videocam" : "location"} size={16} color="#10B981" />
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{appointment.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{appointment.time}</Text>
                  </View>
                </View>

                <View style={styles.appointmentFooter}>
                  <Text style={styles.locationText}>{appointment.location}</Text>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>
                      {appointment.type === "video" ? "Join Call" : "View Details"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Past Appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Appointments</Text>
          <View style={styles.appointmentsList}>
            {pastAppointments.map((appointment) => (
              <View key={appointment.id} style={[styles.appointmentCard, styles.pastAppointmentCard]}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.doctorInfo}>
                    <View style={[styles.doctorAvatar, styles.pastDoctorAvatar]}>
                      <Ionicons name="medical" size={24} color="#9CA3AF" />
                    </View>
                    <View>
                      <Text style={styles.doctorName}>{appointment.doctor}</Text>
                      <Text style={styles.specialty}>{appointment.specialty}</Text>
                    </View>
                  </View>
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
                    <Text style={[styles.detailText, styles.pastDetailText]}>{appointment.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                    <Text style={[styles.detailText, styles.pastDetailText]}>{appointment.time}</Text>
                  </View>
                </View>

                <View style={styles.appointmentFooter}>
                  <Text style={[styles.locationText, styles.pastLocationText]}>{appointment.location}</Text>
                  <TouchableOpacity style={[styles.actionButton, styles.pastActionButton]}>
                    <Text style={styles.pastActionButtonText}>View Summary</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Book New Appointment */}
        <TouchableOpacity style={styles.bookButton}>
          <Ionicons name="calendar" size={20} color="white" />
          <Text style={styles.bookButtonText}>Book New Appointment</Text>
        </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  addButton: {
    backgroundColor: "#10B981",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
  appointmentsList: {
    gap: 16,
  },
  appointmentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pastAppointmentCard: {
    opacity: 0.8,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pastDoctorAvatar: {
    backgroundColor: "#F3F4F6",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  specialty: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  appointmentType: {
    padding: 8,
  },
  appointmentDetails: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  pastDetailText: {
    color: "#9CA3AF",
  },
  appointmentFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#6B7280",
  },
  pastLocationText: {
    color: "#9CA3AF",
  },
  actionButton: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pastActionButton: {
    backgroundColor: "#F9FAFB",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  pastActionButtonText: {
    color: "#9CA3AF",
  },
  completedBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    marginHorizontal: 20,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
})

export default AppointmentsScreen
