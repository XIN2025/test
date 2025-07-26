import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  Pill,
  Plus,
  ShoppingCart,
  Star,
  Heart,
  TrendingUp,
  Clock,
  CheckCircle,
} from "lucide-react-native";
import Card from "@/components/ui/card";

interface Supplement {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  rating: number;
  inStock: boolean;
  isRecommended: boolean;
  dosage: string;
  frequency: string;
}

export default function SupplementsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "All", icon: Pill },
    { id: "vitamins", name: "Vitamins", icon: Heart },
    { id: "minerals", name: "Minerals", icon: Star },
    { id: "protein", name: "Protein", icon: TrendingUp },
  ];

  const supplements: Supplement[] = [
    {
      id: "1",
      name: "Vitamin D3",
      category: "vitamins",
      description: "Essential for bone health and immune system support",
      price: 24.99,
      rating: 4.8,
      inStock: true,
      isRecommended: true,
      dosage: "1000 IU",
      frequency: "Daily",
    },
    {
      id: "2",
      name: "Omega-3 Fish Oil",
      category: "vitamins",
      description: "Supports heart health and brain function",
      price: 32.5,
      rating: 4.6,
      inStock: true,
      isRecommended: true,
      dosage: "1000mg",
      frequency: "Twice daily",
    },
    {
      id: "3",
      name: "Whey Protein",
      category: "protein",
      description: "High-quality protein for muscle recovery",
      price: 45.0,
      rating: 4.7,
      inStock: true,
      isRecommended: false,
      dosage: "30g",
      frequency: "Post-workout",
    },
    {
      id: "4",
      name: "Magnesium",
      category: "minerals",
      description: "Supports muscle and nerve function",
      price: 18.99,
      rating: 4.5,
      inStock: false,
      isRecommended: true,
      dosage: "400mg",
      frequency: "Daily",
    },
  ];

  const filteredSupplements =
    selectedCategory === "all"
      ? supplements
      : supplements.filter((s) => s.category === selectedCategory);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={12}
        color={i < Math.floor(rating) ? "#fbbf24" : "#d1d5db"}
        fill={i < Math.floor(rating) ? "#fbbf24" : "none"}
      />
    ));
  };

  return (
    <LinearGradient
      colors={["#ecfdf5", "#f0fdfa"]}
      className="flex-1"
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <ScrollView contentContainerClassName="pb-8">
        {/* Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
                <Pill size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">Supplements</Text>
                <Text className="text-sm text-gray-600">
                  Your health essentials
                </Text>
              </View>
            </View>
            <TouchableOpacity className="p-2">
              <ShoppingCart size={20} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 space-y-6 mt-4">
          {/* Categories */}
          <View className="flex-row space-x-2">
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategory(category.id)}
                className={`flex-row items-center px-3 py-2 rounded-full border ${
                  selectedCategory === category.id
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <category.icon
                  size={16}
                  color={selectedCategory === category.id ? "#fff" : "#64748b"}
                  className="mr-1"
                />
                <Text
                  className={`text-sm font-medium ${
                    selectedCategory === category.id
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recommended Section */}
          <Card className="border-0">
            <View className="p-4">
              <View className="flex-row items-center mb-3">
                <Star size={20} color="#fbbf24" className="mr-2" />
                <Text className="text-lg font-semibold text-gray-800">
                  Recommended for You
                </Text>
              </View>
              <Text className="text-sm text-gray-600 mb-4">
                Based on your health profile and recent activity
              </Text>
              {supplements
                .filter((s) => s.isRecommended)
                .map((supplement) => (
                  <View
                    key={supplement.id}
                    className="flex-row items-center p-3 bg-emerald-50 rounded-lg mb-2"
                  >
                    <View className="w-12 h-12 bg-emerald-100 rounded-lg items-center justify-center mr-3">
                      <Pill size={24} color="#059669" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">
                        {supplement.name}
                      </Text>
                      <Text className="text-xs text-gray-600">
                        {supplement.description}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <View className="flex-row items-center mr-2">
                          {renderStars(supplement.rating)}
                        </View>
                        <Text className="text-xs text-gray-500">
                          ({supplement.rating})
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="font-semibold text-emerald-600">
                        ${supplement.price}
                      </Text>
                      <TouchableOpacity className="bg-emerald-600 px-3 py-1 rounded-full mt-1">
                        <Text className="text-xs text-white font-medium">
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          </Card>

          {/* All Supplements */}
          <Card className="border-0">
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-800 mb-4">
                All Supplements
              </Text>
              {filteredSupplements.map((supplement) => (
                <View
                  key={supplement.id}
                  className="border-b border-gray-100 pb-4 mb-4 last:border-b-0"
                >
                  <View className="flex-row items-start">
                    <View className="w-16 h-16 bg-gray-100 rounded-lg items-center justify-center mr-3">
                      <Pill size={28} color="#64748b" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between">
                        <Text className="font-semibold text-gray-800">
                          {supplement.name}
                        </Text>
                        <Text className="font-semibold text-emerald-600">
                          ${supplement.price}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-600 mt-1">
                        {supplement.description}
                      </Text>
                      <View className="flex-row items-center mt-2 space-x-4">
                        <View className="flex-row items-center">
                          <Clock size={12} color="#64748b" className="mr-1" />
                          <Text className="text-xs text-gray-500">
                            {supplement.frequency}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <Pill size={12} color="#64748b" className="mr-1" />
                          <Text className="text-xs text-gray-500">
                            {supplement.dosage}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center justify-between mt-2">
                        <View className="flex-row items-center">
                          {renderStars(supplement.rating)}
                          <Text className="text-xs text-gray-500 ml-1">
                            ({supplement.rating})
                          </Text>
                        </View>
                        <View className="flex-row items-center space-x-2">
                          {!supplement.inStock && (
                            <Text className="text-xs text-red-500">
                              Out of Stock
                            </Text>
                          )}
                          <TouchableOpacity
                            className={`px-3 py-1 rounded-full ${
                              supplement.inStock
                                ? "bg-emerald-600"
                                : "bg-gray-300"
                            }`}
                            disabled={!supplement.inStock}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                supplement.inStock
                                  ? "text-white"
                                  : "text-gray-500"
                              }`}
                            >
                              {supplement.inStock
                                ? "Add to Cart"
                                : "Unavailable"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}
