import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text } from "react-native";
import { useFonts } from "../hooks/useFonts";
import { ThemeProvider } from "../context/ThemeContext";
import "./global.css";

export default function RootLayout() {
  const fontsLoaded = useFonts();

  if (!fontsLoaded) {
    return (
      <ThemeProvider>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f0fdf4",
          }}
        >
          <Text style={{ color: "#059669", fontSize: 18 }}>Loading...</Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
