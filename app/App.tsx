import { StatusBar } from "expo-status-bar";
import RootNavigation from "./src/navigation/RootNavigation";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import "./global.css";

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <BottomSheetModalProvider>
        <StatusBar style="dark" />
        <RootNavigation />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
