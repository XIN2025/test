import { useFonts as useExpoFonts } from 'expo-font';
import { useEffect } from 'react';

export function useFonts() {
  const [fontsLoaded, fontError] = useExpoFonts({
    Evra: require('../assets/fonts/evra.otf'),
    SourceSansPro: require('../assets/fonts/source-sans-pro.otf'),
  });

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
    if (fontsLoaded) {
      console.log('Fonts loaded successfully');
      console.log('Available font families:', ['Evra', 'SourceSansPro']);
    }
  }, [fontsLoaded, fontError]);

  return fontsLoaded;
}
