"use client"

import React, { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Picker } from "@react-native-picker/picker"

interface PreferencesScreenProps {
  navigation: any
}

const PreferencesScreen: React.FC<PreferencesScreenProps> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1)
  const [preferences, setPreferences] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "",
    healthGoals: [] as string[],
    medicalConditions: "",
    medications: "",
    allergies: "",
    emergencyContact: "",
    preferredDoctor: "",
  })

  const healthGoalOptions = [
    "Weight Management",
    "Fitness Improvement",
    "Better Sleep",
    "Stress Reduction",
    "Heart Health",
    "Diabetes Management",
    "Blood Pressure Control",
    "Mental Wellness",
  ]

  const handleGoalToggle = (goal: string) => {
    setPreferences((prev) => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter((g) => g !== goal)
        : [...prev.healthGoals, goal],
    }))
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  const handleComplete = () => {
    Alert.alert("Setup Complete", "Your health profile has been created successfully!", [
      {
        text: "Continue",
        onPress: () => navigation.replace("Main"),
      },
    ])
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <View style={[styles.stepCircle, step <= currentStep ? styles.stepCircleActive : styles.stepCircleInactive]}>
            <Text
              style={[styles.stepNumber, step <= currentStep ? styles.stepNumberActive : styles.stepNumberInactive]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && (
            <View style={[styles.stepLine, step < currentStep ? styles.stepLineActive : styles.stepLineInactive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  )

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Ionicons name="person-outline" size={24} color="#10B981" />
        <Text style={styles.stepTitle}>Basic Information</Text>
      </View>
      <Text style={styles.stepSubtitle}>Tell us about yourself</Text>

      <View style={styles.form}>
        <View style={styles.row}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="25"
              value={preferences.age}
              onChangeText={(text) => setPreferences((prev) => ({ ...prev, age: text }))}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={preferences.gender}
                onValueChange={(value) => setPreferences((prev) => ({ ...prev, gender: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Select gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
                <Picker.Item label="Prefer not to say" value="prefer-not-to-say" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="170"
              value={preferences.height}
              onChangeText={(text) => setPreferences((prev) => ({ ...prev, height: text }))}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={[styles.inputContainer, styles.halfWidth]}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="70"
              value={preferences.weight}
              onChangeText={(text) => setPreferences((prev) => ({ ...prev, weight: text }))}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Activity Level</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={preferences.activityLevel}
              onValueChange={(value) => setPreferences((prev) => ({ ...prev, activityLevel: value }))}
              style={styles.picker}
            >
              <Picker.Item label="Select your activity level" value="" />
              <Picker.Item label="Sedentary (little to no exercise)" value="sedentary" />
              <Picker.Item label="Light (1-3 days/week)" value="light" />
              <Picker.Item label="Moderate (3-5 days/week)" value="moderate" />
              <Picker.Item label="Active (6-7 days/week)" value="active" />
              <Picker.Item label="Very Active (2x/day or intense)" value="very-active" />
            </Picker>
          </View>
        </View>
      </View>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Ionicons name="target-outline" size={24} color="#10B981" />
        <Text style={styles.stepTitle}>Health Goals</Text>
      </View>
      <Text style={styles.stepSubtitle}>What would you like to focus on? (Select all that apply)</Text>

      <View style={styles.goalsContainer}>
        {healthGoalOptions.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[styles.goalItem, preferences.healthGoals.includes(goal) && styles.goalItemSelected]}
            onPress={() => handleGoalToggle(goal)}
          >
            <View style={[styles.goalCheckbox, preferences.healthGoals.includes(goal) && styles.goalCheckboxSelected]}>
              {preferences.healthGoals.includes(goal) && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
            <Text style={[styles.goalText, preferences.healthGoals.includes(goal) && styles.goalTextSelected]}>
              {goal}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <Ionicons name="medical-outline" size={24} color="#10B981" />
        <Text style={styles.stepTitle}>Medical Information</Text>
      </View>
      <Text style={styles.stepSubtitle}>Help us provide safer recommendations</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Medical Conditions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List any medical conditions (diabetes, hypertension, etc.)"
            value={preferences.medicalConditions}
            onChangeText={(text) => setPreferences((prev) => ({ ...prev, medicalConditions: text }))}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Medications</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List current medications and supplements"
            value={preferences.medications}
            onChangeText={(text) => setPreferences((prev) => ({ ...prev, medications: text }))}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Allergies</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="List any known allergies"
            value={preferences.allergies}
            onChangeText={(text) => setPreferences((prev) => ({ ...prev, allergies: text }))}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Emergency contact name and phone"
            value={preferences.emergencyContact}
            onChangeText={(text) => setPreferences((prev) => ({ ...prev, emergencyContact: text }))}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Preferred Doctor</Text>
          <TextInput
            style={styles.input}
            placeholder="Your primary care physician"
            value={preferences.preferredDoctor}
            onChangeText={(text) => setPreferences((prev) => ({ ...prev, preferredDoctor: text }))}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="heart" size={24} color="white" />
            </View>
            <Text style={styles.logoText}>Evra</Text>
          </View>
          <Text style={styles.headerTitle}>Let's personalize your health journey</Text>
          <Text style={styles.headerSubtitle}>
            Help us understand your health profile to provide better recommendations
          </Text>
        </View>

        {renderStepIndicator()}

        <View style={styles.card}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={prevStep}>
                <Text style={styles.backButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
              onPress={currentStep < 3 ? nextStep : handleComplete}
            >
              <Text style={styles.nextButtonText}>{currentStep < 3 ? "Next" : "Complete Setup"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#047857",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: {
    backgroundColor: "#10B981",
  },
  stepCircleInactive: {
    backgroundColor: "#E5E7EB",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  stepNumberActive: {
    color: "white",
  },
  stepNumberInactive: {
    color: "#9CA3AF",
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: "#10B981",
  },
  stepLineInactive: {
    backgroundColor: "#E5E7EB",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepContent: {
    marginBottom: 24,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputContainer: {
    marginBottom: 16,
  },
  halfWidth: {
    flex: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
  },
  picker: {
    height: 50,
  },
  goalsContainer: {
    gap: 12,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  goalItemSelected: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  goalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  goalCheckboxSelected: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  goalText: {
    fontSize: 14,
    color: "#374151",
  },
  goalTextSelected: {
    color: "#047857",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  backButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  nextButton: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonFull: {
    flex: 1,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
})

export default PreferencesScreen
