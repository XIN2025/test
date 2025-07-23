import React from "react";
import { View, Text } from "react-native";
import { FlashList } from "@shopify/flash-list";

interface Item {
  id: string;
  title: string;
  description: string;
}

const DEMO_DATA: Item[] = Array.from({ length: 30 }, (_, i) => ({
  id: `${i + 1}`,
  title: `Item ${i + 1}`,
  description: `This is a description for item ${i + 1}`,
}));

export const DemoList = () => {
  const renderItem = ({ item }: { item: Item }) => (
    <View className="p-4 border-b border-gray-100">
      <Text className="text-gray-900 font-medium mb-1">{item.title}</Text>
      <Text className="text-gray-600 text-sm">{item.description}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-white">
      <FlashList
        data={DEMO_DATA}
        renderItem={renderItem}
        estimatedItemSize={80}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};
