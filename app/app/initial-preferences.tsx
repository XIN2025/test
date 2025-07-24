import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

const healthGoalsList = [
  "Weight Loss",
  "Fitness",
  "Mental Health",
  "Nutrition",
  "Sleep Improvement",
];
const conditionsList = [
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Heart Disease",
  "None",
];
const communicationStyles = ["Formal", "Friendly", "Concise", "Detailed"];

export default function InitialPreferences() {
  const { email } = useLocalSearchParams();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [communicationStyle, setCommunicationStyle] = useState<string>("");
  const [notifications, setNotifications] = useState(false);
  const [loading, setLoading] = useState(false);

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
    if (!name || !age || !gender || !communicationStyle) {
      Alert.alert("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/user/preferences",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email, // <-- include email from params
            name,
            age: Number(age),
            gender,
            healthGoals,
            conditions,
            communicationStyle,
            notifications,
          }),
        }
      );
      if (response.ok) {
        Alert.alert("Preferences saved!");
        // Navigate to dashboard
        // Assuming 'router' is available from 'expo-router' or similar
        // For now, we'll just alert and let the user navigate manually or via a different method
        Alert.alert(
          "Preferences saved!",
          "You will be redirected to the dashboard."
        );
        // TODO: Navigate to main app/chatbot page
      } else {
        Alert.alert("Failed to save preferences.");
      }
    } catch (err) {
      Alert.alert("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell us about yourself</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Age"
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Gender"
        value={gender}
        onChangeText={setGender}
      />
      <Text style={styles.label}>Health Goals</Text>
      <View style={styles.multiSelect}>
        {healthGoalsList.map((goal) => (
          <Button
            key={goal}
            title={goal}
            color={healthGoals.includes(goal) ? "#007AFF" : "#ccc"}
            onPress={() => toggleSelection(goal, healthGoals, setHealthGoals)}
          />
        ))}
      </View>
      <Text style={styles.label}>Existing Conditions</Text>
      <View style={styles.multiSelect}>
        {conditionsList.map((cond) => (
          <Button
            key={cond}
            title={cond}
            color={conditions.includes(cond) ? "#007AFF" : "#ccc"}
            onPress={() => toggleSelection(cond, conditions, setConditions)}
          />
        ))}
      </View>
      <Text style={styles.label}>Preferred Communication Style</Text>
      <View style={styles.multiSelect}>
        {communicationStyles.map((style) => (
          <Button
            key={style}
            title={style}
            color={communicationStyle === style ? "#007AFF" : "#ccc"}
            onPress={() => setCommunicationStyle(style)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Button
          title={notifications ? "Yes" : "No"}
          onPress={() => setNotifications(!notifications)}
          color={notifications ? "#007AFF" : "#ccc"}
        />
      </View>
      <Button
        title={loading ? "Saving..." : "Submit"}
        onPress={handleSubmit}
        disabled={loading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  label: {
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 4,
  },
  multiSelect: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
});
