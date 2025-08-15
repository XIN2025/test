import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Star,
  Heart,
  TrendingUp,
  Pill,
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

interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "delivered" | "shipped" | "processing" | "cancelled";
  total: number;
  items: OrderItem[];
  trackingNumber?: string;
  estimatedDelivery?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export default function OrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState<"orders" | "supplements">(
    "orders"
  );

  const statusFilters = [
    { id: "all", name: "All Orders", icon: ShoppingBag },
    { id: "processing", name: "Processing", icon: Clock },
    { id: "shipped", name: "Shipped", icon: Truck },
    { id: "delivered", name: "Delivered", icon: CheckCircle },
  ];

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

  const orders: Order[] = [
    {
      id: "1",
      orderNumber: "ORD-2024-001",
      date: "2024-01-15",
      status: "delivered",
      total: 89.97,
      items: [
        { id: "1", name: "Vitamin D3", quantity: 2, price: 24.99 },
        { id: "2", name: "Omega-3 Fish Oil", quantity: 1, price: 32.5 },
        { id: "3", name: "Magnesium", quantity: 1, price: 18.99 },
      ],
      trackingNumber: "1Z999AA1234567890",
    },
    {
      id: "2",
      orderNumber: "ORD-2024-002",
      date: "2024-01-20",
      status: "shipped",
      total: 45.0,
      items: [{ id: "4", name: "Whey Protein", quantity: 1, price: 45.0 }],
      trackingNumber: "1Z999AA1234567891",
      estimatedDelivery: "2024-01-25",
    },
    {
      id: "3",
      orderNumber: "ORD-2024-003",
      date: "2024-01-22",
      status: "processing",
      total: 67.48,
      items: [
        { id: "1", name: "Vitamin D3", quantity: 1, price: 24.99 },
        { id: "5", name: "Vitamin B12", quantity: 1, price: 19.99 },
        { id: "6", name: "Zinc", quantity: 1, price: 22.5 },
      ],
    },
  ];

  const filteredOrders =
    selectedStatus === "all"
      ? orders
      : orders.filter((o) => o.status === selectedStatus);

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "delivered":
        return "text-green-700";
      case "shipped":
        return "text-blue-600";
      case "processing":
        return "text-amber-600";
      case "cancelled":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "delivered":
        return CheckCircle;
      case "shipped":
        return Truck;
      case "processing":
        return Clock;
      case "cancelled":
        return RefreshCw;
      default:
        return Clock;
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "delivered":
        return "Delivered";
      case "shipped":
        return "Shipped";
      case "processing":
        return "Processing";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View
          className={`shadow-sm border-b px-4 py-4 z-10 ${
            isDarkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-100"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: isDarkMode ? "#1f6f51" : "#114131" }}
              >
                {activeTab === "orders" ? (
                  <ShoppingBag size={20} color="#fff" />
                ) : (
                  <Pill size={20} color="#fff" />
                )}
              </View>
              <View>
                <Text
                  className={`font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  {activeTab === "orders" ? "Orders" : "Supplements"}
                </Text>
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {activeTab === "orders"
                    ? "Track your purchases"
                    : "Your health essentials"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center space-x-2">
              <TouchableOpacity
                onPress={() => setActiveTab("orders")}
                className={`px-3 py-1 rounded-full ${
                  activeTab === "orders"
                    ? isDarkMode
                      ? "bg-emerald-600"
                      : "bg-emerald-600"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm ${
                    activeTab === "orders"
                      ? "text-white"
                      : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  Orders
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab("supplements")}
                className={`px-3 py-1 rounded-full ${
                  activeTab === "supplements"
                    ? isDarkMode
                      ? "bg-emerald-600"
                      : "bg-emerald-600"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm ${
                    activeTab === "supplements"
                      ? "text-white"
                      : isDarkMode
                      ? "text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  Supplements
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <View className="px-4 space-y-6 mt-4">
            {activeTab === "orders" ? (
              /* Status Filters */
              <View className="flex-row space-x-2">
                {statusFilters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    onPress={() => setSelectedStatus(filter.id)}
                    className={`flex-row items-center px-3 py-2 rounded-full border ${
                      selectedStatus === filter.id
                        ? "border-emerald-600"
                        : isDarkMode
                        ? "border-gray-700"
                        : "border-gray-200"
                    }`}
                    style={{
                      backgroundColor:
                        selectedStatus === filter.id
                          ? isDarkMode
                            ? "#065f46"
                            : "#059669"
                          : isDarkMode
                          ? "#1f2937"
                          : "#ffffff",
                    }}
                  >
                    <filter.icon
                      size={16}
                      color={
                        selectedStatus === filter.id
                          ? "#fff"
                          : isDarkMode
                          ? "#9ca3af"
                          : "#64748b"
                      }
                      className="mr-1"
                    />
                    <Text
                      className={`text-sm font-medium ${
                        selectedStatus === filter.id
                          ? "text-white"
                          : isDarkMode
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {filter.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              /* Categories */
              <View className="flex-row space-x-2">
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategory(category.id)}
                    className={`flex-row items-center px-3 py-2 rounded-full border ${
                      selectedCategory === category.id
                        ? "bg-emerald-600 border-emerald-600"
                        : isDarkMode
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <category.icon
                      size={16}
                      color={
                        selectedCategory === category.id
                          ? "#fff"
                          : isDarkMode
                          ? "#9ca3af"
                          : "#64748b"
                      }
                      className="mr-1"
                    />
                    <Text
                      className={`text-sm font-medium ${
                        selectedCategory === category.id
                          ? "text-white"
                          : isDarkMode
                          ? "text-gray-300"
                          : "text-gray-700"
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Recommended Reorders */}
            {orders.filter((order) => order.status === "delivered").length >
              0 && (
              <Card
                className={`border-0 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <Star size={20} color="#fbbf24" className="mr-2" />
                      <Text
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        Time to Reorder?
                      </Text>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="mb-4"
                  >
                    {orders
                      .filter((order) => order.status === "delivered")
                      .flatMap((order) => order.items)
                      .slice(0, 3)
                      .map((item) => (
                        <View
                          key={item.id}
                          className={`mr-4 p-3 rounded-lg w-64 ${
                            isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
                          }`}
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <View
                              className={`w-10 h-10 rounded-lg items-center justify-center ${
                                isDarkMode
                                  ? "bg-emerald-800/50"
                                  : "bg-emerald-100"
                              }`}
                            >
                              <Package
                                size={20}
                                color={isDarkMode ? "#34d399" : "#059669"}
                              />
                            </View>
                            <Text
                              className={`font-semibold ${
                                isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                              }`}
                            >
                              ${item.price.toFixed(2)}
                            </Text>
                          </View>
                          <Text
                            className={`font-medium mb-1 ${
                              isDarkMode ? "text-gray-100" : "text-gray-800"
                            }`}
                          >
                            {item.name}
                          </Text>
                          <Text
                            className={`text-xs mb-2 ${
                              isDarkMode ? "text-gray-400" : "text-gray-600"
                            }`}
                          >
                            Last ordered quantity: {item.quantity}
                          </Text>
                          <TouchableOpacity
                            className={`py-2 rounded-lg ${
                              isDarkMode ? "bg-emerald-600" : "bg-emerald-600"
                            }`}
                          >
                            <Text className="text-white text-center text-sm font-medium">
                              Quick Reorder
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </ScrollView>
                </View>
              </Card>
            )}

            {activeTab === "orders" ? (
              <>
                {/* Orders List */}
                {filteredOrders.map((order) => {
                  const StatusIcon = getStatusIcon(order.status);
                  return (
                    <Card
                      key={order.id}
                      className={`border-0 ${
                        isDarkMode ? "bg-gray-800" : "bg-white"
                      }`}
                    >
                      <View className="p-4">
                        {/* Order Header */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View>
                            <Text
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-100" : "text-gray-800"
                              }`}
                            >
                              {order.orderNumber}
                            </Text>
                            <Text
                              className={`text-sm ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {order.date}
                            </Text>
                          </View>
                          <View className="items-end">
                            <Text
                              className={`font-semibold ${
                                isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                              }`}
                            >
                              ${order.total.toFixed(2)}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <StatusIcon
                                size={14}
                                color={
                                  isDarkMode
                                    ? getStatusColor(order.status)
                                        .replace("text-", "")
                                        .replace("-700", "")
                                        .replace("green", "#34d399")
                                        .replace("blue", "#60a5fa")
                                        .replace("amber", "#fbbf24")
                                        .replace("red", "#f87171")
                                    : getStatusColor(order.status)
                                        .replace("text-", "")
                                        .replace("-600", "")
                                }
                                className="mr-1"
                              />
                              <Text
                                className={`text-xs font-medium ${
                                  isDarkMode
                                    ? getStatusColor(order.status).replace(
                                        "-600",
                                        "-400"
                                      )
                                    : getStatusColor(order.status)
                                }`}
                              >
                                {getStatusText(order.status)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Order Items */}
                        <View className="space-y-2 mb-3">
                          {order.items.map((item) => (
                            <View
                              key={item.id}
                              className={`flex-row items-center justify-between p-2 rounded-lg ${
                                isDarkMode ? "bg-gray-700/50" : "bg-gray-50"
                              }`}
                            >
                              <View className="flex-row items-center">
                                <View
                                  className={`w-8 h-8 rounded items-center justify-center mr-2 ${
                                    isDarkMode ? "bg-gray-600" : "bg-gray-200"
                                  }`}
                                >
                                  <Package
                                    size={16}
                                    color={isDarkMode ? "#9ca3af" : "#64748b"}
                                  />
                                </View>
                                <View>
                                  <Text
                                    className={`font-medium ${
                                      isDarkMode
                                        ? "text-gray-100"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {item.name}
                                  </Text>
                                  <View className="flex-row items-center space-x-2">
                                    <Text
                                      className={`text-xs ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      Qty: {item.quantity}
                                    </Text>
                                    <Text
                                      className={`text-xs ${
                                        isDarkMode
                                          ? "text-emerald-400"
                                          : "text-emerald-600"
                                      }`}
                                    >
                                      •
                                    </Text>
                                    <Text
                                      className={`text-xs ${
                                        isDarkMode
                                          ? "text-gray-400"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      ${item.price.toFixed(2)} each
                                    </Text>
                                  </View>
                                </View>
                              </View>
                              <Text
                                className={`font-medium ${
                                  isDarkMode ? "text-gray-100" : "text-gray-800"
                                }`}
                              >
                                ${(item.price * item.quantity).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Tracking Info */}
                        {order.trackingNumber && (
                          <View
                            className={`p-3 rounded-lg mb-3 ${
                              isDarkMode ? "bg-emerald-950/50" : "bg-emerald-50"
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium mb-1 ${
                                isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-800"
                              }`}
                            >
                              Tracking Information
                            </Text>
                            <Text
                              className={`text-xs ${
                                isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-700"
                              }`}
                            >
                              Tracking #: {order.trackingNumber}
                            </Text>
                            {order.estimatedDelivery && (
                              <Text
                                className={`text-xs ${
                                  isDarkMode
                                    ? "text-emerald-400"
                                    : "text-emerald-700"
                                }`}
                              >
                                Estimated Delivery: {order.estimatedDelivery}
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Action Buttons */}
                        <View className="flex-row space-x-2">
                          <TouchableOpacity
                            className={`flex-1 py-2 rounded-lg ${
                              isDarkMode ? "bg-emerald-600" : "bg-emerald-600"
                            }`}
                          >
                            <Text className="text-white text-center font-medium">
                              Track Order
                            </Text>
                          </TouchableOpacity>
                          {order.status === "delivered" && (
                            <TouchableOpacity
                              className={`flex-1 py-2 rounded-lg ${
                                isDarkMode ? "bg-gray-700" : "bg-gray-100"
                              }`}
                            >
                              <Text
                                className={`text-center font-medium ${
                                  isDarkMode ? "text-gray-100" : "text-gray-700"
                                }`}
                              >
                                Reorder
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            className={`p-2 rounded-lg ${
                              isDarkMode ? "bg-gray-700" : "bg-gray-100"
                            }`}
                          >
                            <ArrowRight
                              size={16}
                              color={isDarkMode ? "#9ca3af" : "#64748b"}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  );
                })}

                {/* Empty State */}
                {filteredOrders.length === 0 && (
                  <Card
                    className={`border-0 ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    }`}
                  >
                    <View className="p-8 items-center">
                      <ShoppingBag
                        size={48}
                        color={isDarkMode ? "#374151" : "#d1d5db"}
                        className="mb-4"
                      />
                      <Text
                        className={`text-lg font-semibold mb-2 ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        No Orders Found
                      </Text>
                      <Text
                        className={`text-sm text-center ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {selectedStatus === "all"
                          ? "You haven't placed any orders yet."
                          : `No ${selectedStatus} orders found.`}
                      </Text>
                    </View>
                  </Card>
                )}
              </>
            ) : (
              <>
                {/* Recommended Section */}
                <Card
                  className={`border-0 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <View className="p-4">
                    <View className="flex-row items-center mb-3">
                      <Star size={20} color="#fbbf24" className="mr-2" />
                      <Text
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-gray-100" : "text-gray-800"
                        }`}
                      >
                        Recommended for You
                      </Text>
                    </View>
                    <Text
                      className={`text-sm ${
                        isDarkMode ? "text-gray-400" : "text-gray-600"
                      } mb-4`}
                    >
                      Based on your health profile and recent activity
                    </Text>
                    {supplements
                      .filter((s) => s.isRecommended)
                      .map((supplement) => (
                        <View
                          key={supplement.id}
                          className={`flex-row items-center p-3 rounded-lg mb-2 ${
                            isDarkMode ? "bg-emerald-900/30" : "bg-emerald-50"
                          }`}
                        >
                          <View
                            className={`w-12 h-12 rounded-lg items-center justify-center mr-3 ${
                              isDarkMode
                                ? "bg-emerald-800/50"
                                : "bg-emerald-100"
                            }`}
                          >
                            <Pill
                              size={24}
                              color={isDarkMode ? "#34d399" : "#059669"}
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`font-semibold ${
                                isDarkMode ? "text-gray-100" : "text-gray-800"
                              }`}
                            >
                              {supplement.name}
                            </Text>
                            <Text
                              className={`text-xs ${
                                isDarkMode ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              {supplement.description}
                            </Text>
                            <View className="flex-row items-center mt-1">
                              <View className="flex-row items-center mr-2">
                                {Array.from({ length: 5 }, (_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    color={
                                      i < Math.floor(supplement.rating)
                                        ? "#fbbf24"
                                        : "#d1d5db"
                                    }
                                    fill={
                                      i < Math.floor(supplement.rating)
                                        ? "#fbbf24"
                                        : "none"
                                    }
                                  />
                                ))}
                              </View>
                              <Text
                                className={`text-xs ${
                                  isDarkMode ? "text-gray-500" : "text-gray-500"
                                }`}
                              >
                                ({supplement.rating})
                              </Text>
                            </View>
                          </View>
                          <View className="items-end">
                            <Text
                              className={`font-semibold ${
                                isDarkMode
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                              }`}
                            >
                              ${supplement.price.toFixed(2)}
                            </Text>
                            <TouchableOpacity
                              className={`px-3 py-1 rounded-full mt-1 ${
                                isDarkMode ? "bg-emerald-700" : "bg-emerald-600"
                              }`}
                            >
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
                <Card
                  className={`border-0 ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <View className="p-4">
                    <Text
                      className={`text-lg font-semibold mb-4 ${
                        isDarkMode ? "text-gray-100" : "text-gray-800"
                      }`}
                    >
                      All Supplements
                    </Text>
                    {supplements
                      .filter(
                        (s) =>
                          selectedCategory === "all" ||
                          s.category === selectedCategory
                      )
                      .map((supplement) => (
                        <View
                          key={supplement.id}
                          className={`border-b pb-4 mb-4 last:border-b-0 ${
                            isDarkMode ? "border-gray-700" : "border-gray-100"
                          }`}
                        >
                          <View className="flex-row items-start">
                            <View
                              className={`w-16 h-16 rounded-lg items-center justify-center mr-3 ${
                                isDarkMode ? "bg-gray-700" : "bg-gray-100"
                              }`}
                            >
                              <Pill
                                size={28}
                                color={isDarkMode ? "#9ca3af" : "#64748b"}
                              />
                            </View>
                            <View className="flex-1">
                              <View className="flex-row items-center justify-between">
                                <Text
                                  className={`font-semibold ${
                                    isDarkMode
                                      ? "text-gray-100"
                                      : "text-gray-800"
                                  }`}
                                >
                                  {supplement.name}
                                </Text>
                                <Text
                                  className={`font-semibold ${
                                    isDarkMode
                                      ? "text-emerald-400"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  ${supplement.price.toFixed(2)}
                                </Text>
                              </View>
                              <Text
                                className={`text-sm mt-1 ${
                                  isDarkMode ? "text-gray-400" : "text-gray-600"
                                }`}
                              >
                                {supplement.description}
                              </Text>
                              <View className="flex-row items-center mt-2 space-x-4">
                                <View className="flex-row items-center">
                                  <Clock
                                    size={12}
                                    color={isDarkMode ? "#9ca3af" : "#64748b"}
                                    className="mr-1"
                                  />
                                  <Text
                                    className={`text-xs ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {supplement.frequency}
                                  </Text>
                                </View>
                                <View className="flex-row items-center">
                                  <Pill
                                    size={12}
                                    color={isDarkMode ? "#9ca3af" : "#64748b"}
                                    className="mr-1"
                                  />
                                  <Text
                                    className={`text-xs ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {supplement.dosage}
                                  </Text>
                                </View>
                              </View>
                              <View className="flex-row items-center justify-between mt-2">
                                <View className="flex-row items-center">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <Star
                                      key={i}
                                      size={12}
                                      color={
                                        i < Math.floor(supplement.rating)
                                          ? "#fbbf24"
                                          : "#d1d5db"
                                      }
                                      fill={
                                        i < Math.floor(supplement.rating)
                                          ? "#fbbf24"
                                          : "none"
                                      }
                                    />
                                  ))}
                                  <Text
                                    className={`text-xs ml-1 ${
                                      isDarkMode
                                        ? "text-gray-400"
                                        : "text-gray-500"
                                    }`}
                                  >
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
                                        ? isDarkMode
                                          ? "bg-emerald-700"
                                          : "bg-emerald-600"
                                        : isDarkMode
                                        ? "bg-gray-700"
                                        : "bg-gray-300"
                                    }`}
                                    disabled={!supplement.inStock}
                                  >
                                    <Text
                                      className={`text-xs font-medium ${
                                        supplement.inStock
                                          ? "text-white"
                                          : isDarkMode
                                          ? "text-gray-400"
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
              </>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
