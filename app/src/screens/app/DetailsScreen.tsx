import { View, Text } from "react-native";
import React from "react";
import { Button } from "../../components/ui/Button";
import { StackNavigationProp } from "@react-navigation/stack";

type RootStackParamList = {
  home: undefined;
  details: undefined;
};

interface Props {
  navigation: StackNavigationProp<RootStackParamList, "details">;
}

const DetailsScreen = ({ navigation }: Props) => {
  return (
    <View className="flex-1 justify-center items-center bg-white p-6">
      <Text className="text-2xl font-bold text-gray-900 mb-4">
        Details Screen
      </Text>
      <Text className="text-gray-600 text-base mb-8">
        This is a demo details screen
      </Text>
      <Button
        title="Go Back"
        onPress={() => navigation.goBack()}
        variant="outline"
      />
    </View>
  );
};

export default DetailsScreen;
