import { View, Text } from "react-native";
import React, { useCallback, useRef, useMemo } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { Button } from "../../components/ui/Button";
import { DemoList } from "../../components/app/DemoList";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";

type RootStackParamList = {
  home: undefined;
  details: undefined;
};

interface Props {
  navigation: StackNavigationProp<RootStackParamList, "home">;
}

const HomeScreen = ({ navigation }: Props) => {
  // Bottom sheet ref
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Variables
  const snapPoints = useMemo(() => ["35%", "50%"], []);

  // Callbacks
  const handleOpenBottomSheet = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleCloseBottomSheet = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    []
  );

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="p-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          OpenGig App Demo
        </Text>
        <Text className="text-gray-600">
          Explore Stack, FlashList and Bottom Sheet demos
        </Text>
      </View>

      {/* Actions */}
      <View className="p-4 flex-row gap-4">
        <Button
          title="Open Sheet"
          onPress={handleOpenBottomSheet}
          variant="primary"
        />
        <Button
          title="Details"
          onPress={() => navigation.navigate("details")}
          variant="outline"
        />
      </View>

      {/* FlashList Demo */}
      <View className="flex-1">
        <DemoList />
      </View>

      {/* Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
      >
        <BottomSheetView className="pb-10">
          <View className="p-6">
            <Text className="text-xl font-bold text-gray-900 mb-4">
              Bottom Sheet Demo
            </Text>
            <Text className="text-gray-600 mb-6">
              This is a demo of the bottom sheet component. It supports
              gestures, backdrop, and multiple snap points.
            </Text>
            <Button
              title="Close"
              onPress={handleCloseBottomSheet}
              variant="outline"
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
};

export default HomeScreen;
