import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import { MessageCircle, Send } from "lucide-react-native";
// Removed file upload related imports

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  suggestions?: string[];
  isLoading?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI health assistant. I can help you with health-related questions, tips, and guidance. How can I assist you today?",
      sender: "bot",
      suggestions: [
        "Tell me about nutrition",
        "How to improve sleep?",
        "What exercises are good for me?",
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // API Configuration
  const API_BASE_URL =
    Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";
  
  // Get user's email from context
  const { userEmail } = useUser();

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: generateUniqueId(),
      text: text.trim(),
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Add loading message
    const loadingMessage: Message = {
      id: generateUniqueId(),
      text: "",
      sender: "bot",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const formData = new FormData();
      formData.append("message", text.trim());
      formData.append("user_email", userEmail);

      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Remove loading message and add response
        setMessages((prev) => prev.filter((msg) => !msg.isLoading));

        const botMessage: Message = {
          id: generateUniqueId(),
          text: data.response,
          sender: "bot",
          suggestions: data.follow_up_questions || [],
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.filter((msg) => !msg.isLoading));

      const errorMessage: Message = {
        id: generateUniqueId(),
        text: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        sender: "bot",
        suggestions: ["Try again", "Ask something else"],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Removed document upload logic

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: "#114131" }}
              >
                <MessageCircle size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">
                  AI Health Assistant
                </Text>
                <Text className="text-sm text-gray-600">
                  Chat with AI • Upload documents
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Removed Uploaded Files Section */}

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              className={`mb-4 ${
                message.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.sender === "user"
                    ? "bg-white shadow-sm border border-gray-100"
                    : "bg-white shadow-sm border border-gray-100"
                }`}
                style={
                  message.sender === "user"
                    ? { backgroundColor: "#114131" }
                    : {}
                }
              >
                {message.isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#114131" />
                    <Text className="text-gray-500 ml-2">
                      AI is thinking...
                    </Text>
                  </View>
                ) : (
                  <Text
                    className={`text-sm ${
                      message.sender === "user" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {message.text}
                  </Text>
                )}
              </View>

              {/* Suggestions */}
              {message.sender === "bot" &&
                message.suggestions &&
                message.suggestions.length > 0 &&
                !message.isLoading && (
                  <View className="mt-3 flex-row flex-wrap">
                    {message.suggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleSuggestionClick(suggestion)}
                        className="bg-white border border-gray-200 rounded-full px-3 py-2 mr-2 mb-2"
                      >
                        <Text className="text-sm text-gray-700">
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>
          ))}

          {/* Upload Progress */}
          {/* Removed Upload Progress UI */}
        </ScrollView>

        {/* Input Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white border-t border-gray-100 px-4 py-4"
        >
          <View className="flex-row items-center">
            {/* Text Input */}
            <View className="flex-1 bg-gray-50 rounded-full px-4 py-2 mr-3">
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                className="text-gray-800"
                multiline
                maxLength={500}
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`p-2 rounded-full ${
                inputText.trim() && !isTyping ? "bg-gray-300" : "bg-gray-300"
              }`}
              style={
                inputText.trim() && !isTyping
                  ? { backgroundColor: "#114131" }
                  : {}
              }
            >
              <Send
                size={20}
                color={inputText.trim() && !isTyping ? "#fff" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>

          {/* Chat Suggestions */}
          <View className="mt-3">
            <Text className="text-xs font-medium text-gray-600 mb-2">
              CHAT SUGGESTIONS
            </Text>
            <View className="flex-row flex-wrap">
              <TouchableOpacity
                onPress={() => handleSendMessage("Book Rx delivery")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text className={`text-xs`} style={{ color: "#114131" }}>
                  Book Rx delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book meal delivery")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text className={`text-xs`} style={{ color: "#114131" }}>
                  Book meal delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book fitness class")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text className={`text-xs`} style={{ color: "#114131" }}>
                  Book fitness class
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book supplement delivery")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text className={`text-xs`} style={{ color: "#114131" }}>
                  Book supplement delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book appointment")}
                className="border border-gray-200 rounded-full px-3 py-1 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
              >
                <Text className={`text-xs`} style={{ color: "#114131" }}>
                  Book appointment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
