import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  ShoppingBag,
  Package,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowRight,
  Star,
} from "lucide-react-native";
import Card from "@/components/ui/card";

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

  const statusFilters = [
    { id: "all", name: "All Orders", icon: ShoppingBag },
    { id: "processing", name: "Processing", icon: Clock },
    { id: "shipped", name: "Shipped", icon: Truck },
    { id: "delivered", name: "Delivered", icon: CheckCircle },
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

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4 z-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#114131" }}
              >
                <ShoppingBag size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">Orders</Text>
                <Text className="text-sm text-gray-600">
                  Track your purchases
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerClassName="pb-8" className="flex-1">
          <View className="px-4 space-y-6 mt-4">
            {/* Status Filters */}
            <View className="flex-row space-x-2">
              {statusFilters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => setSelectedStatus(filter.id)}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    selectedStatus === filter.id
                      ? "bg-white border-gray-200"
                      : "bg-white border-gray-200"
                  }`}
                  style={{
                    backgroundColor:
                      selectedStatus === filter.id ? "#059669" : "#ffffff",
                    borderColor:
                      selectedStatus === filter.id ? "#059669" : "#e5e7eb",
                  }}
                >
                  <filter.icon
                    size={16}
                    color={selectedStatus === filter.id ? "#fff" : "#64748b"}
                    className="mr-1"
                  />
                  <Text
                    className={`text-sm font-medium ${
                      selectedStatus === filter.id
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {filter.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Orders List */}
            {filteredOrders.map((order) => {
              const StatusIcon = getStatusIcon(order.status);
              return (
                <Card key={order.id} className="border-0">
                  <View className="p-4">
                    {/* Order Header */}
                    <View className="flex-row items-center justify-between mb-3">
                      <View>
                        <Text className="font-semibold text-gray-800">
                          {order.orderNumber}
                        </Text>
                        <Text className="text-sm text-gray-600">
                          {order.date}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="font-semibold"
                          style={{ color: "#059669" }}
                        >
                          ${order.total.toFixed(2)}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <StatusIcon
                            size={14}
                            color={getStatusColor(order.status)
                              .replace("text-", "")
                              .replace("-600", "")}
                            className="mr-1"
                          />
                          <Text
                            className={`text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
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
                          className="flex-row items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <View className="flex-row items-center">
                            <View className="w-8 h-8 bg-gray-200 rounded items-center justify-center mr-2">
                              <Package size={16} color="#64748b" />
                            </View>
                            <View>
                              <Text className="font-medium text-gray-800">
                                {item.name}
                              </Text>
                              <Text className="text-xs text-gray-600">
                                Qty: {item.quantity}
                              </Text>
                            </View>
                          </View>
                          <Text className="font-medium text-gray-800">
                            ${(item.price * item.quantity).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <View
                        className="p-3 rounded-lg mb-3"
                        style={{ backgroundColor: "#f0fdf4" }}
                      >
                        <Text
                          className="text-sm font-medium mb-1"
                          style={{ color: "#166534" }}
                        >
                          Tracking Information
                        </Text>
                        <Text className="text-xs" style={{ color: "#15803d" }}>
                          Tracking #: {order.trackingNumber}
                        </Text>
                        {order.estimatedDelivery && (
                          <Text
                            className="text-xs"
                            style={{ color: "#15803d" }}
                          >
                            Estimated Delivery: {order.estimatedDelivery}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Action Buttons */}
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        className="flex-1 py-2 rounded-lg"
                        style={{ backgroundColor: "#059669" }}
                      >
                        <Text className="text-white text-center font-medium">
                          Track Order
                        </Text>
                      </TouchableOpacity>
                      {order.status === "delivered" && (
                        <TouchableOpacity className="flex-1 bg-gray-100 py-2 rounded-lg">
                          <Text className="text-gray-700 text-center font-medium">
                            Reorder
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity className="bg-gray-100 p-2 rounded-lg">
                        <ArrowRight size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })}

            {/* Empty State */}
            {filteredOrders.length === 0 && (
              <Card className="border-0">
                <View className="p-8 items-center">
                  <ShoppingBag size={48} color="#d1d5db" className="mb-4" />
                  <Text className="text-lg font-semibold text-gray-800 mb-2">
                    No Orders Found
                  </Text>
                  <Text className="text-sm text-gray-600 text-center">
                    {selectedStatus === "all"
                      ? "You haven't placed any orders yet."
                      : `No ${selectedStatus} orders found.`}
                  </Text>
                </View>
              </Card>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}
