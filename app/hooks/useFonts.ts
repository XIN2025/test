import { useFonts as useExpoFonts } from "expo-font";
import { useEffect } from "react";

export function useFonts() {
  const [fontsLoaded, fontError] = useExpoFonts({
    Evra: require("../assets/fonts/evra.otf"),
  });

  useEffect(() => {
    if (fontError) {
      console.error("Font loading error:", fontError);
    }
    if (fontsLoaded) {
      console.log("Fonts loaded successfully");
      console.log("Available font families:", ["Evra"]);
    }
  }, [fontsLoaded, fontError]);

  return fontsLoaded;
}
