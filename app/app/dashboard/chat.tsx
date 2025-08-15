import React, { useState, useRef, useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { useTheme } from "../../context/ThemeContext";
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
      text: "Hello! I'm your AI health agent. I can help you with health-related questions, tips, and guidance. How can I assist you today?",
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

  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={isDarkMode ? ["#111827", "#1f2937"] : ["#f0f9f6", "#e6f4f1"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View
          className={`shadow-sm border-b px-4 py-4 ${
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
                <MessageCircle size={20} color="#fff" />
              </View>
              <View>
                <Text
                  className={`font-semibold ${
                    isDarkMode ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  AI Health Agent
                </Text>
                <Text
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  Chat with Evra • Upload documents
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
                    ? isDarkMode
                      ? "bg-emerald-900 border-emerald-800"
                      : "bg-emerald-800"
                    : isDarkMode
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-white shadow-sm border border-gray-100"
                }`}
              >
                {message.isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator
                      size="small"
                      color={isDarkMode ? "#34d399" : "#114131"}
                    />
                    <Text
                      className={`ml-2 ${
                        isDarkMode ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      AI is thinking...
                    </Text>
                  </View>
                ) : (
                  <Text
                    className={`text-sm ${
                      message.sender === "user"
                        ? "text-white"
                        : isDarkMode
                        ? "text-gray-100"
                        : "text-gray-800"
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
                        className={`border rounded-full px-3 py-2 mr-2 mb-2 ${
                          isDarkMode
                            ? "bg-gray-800 border-gray-700"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            isDarkMode ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
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
          className={`border-t px-4 py-4 ${
            isDarkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-100"
          }`}
        >
          <View className="flex-row items-center">
            {/* Text Input */}
            <View
              className={`flex-1 rounded-full px-4 py-2 mr-3 ${
                isDarkMode ? "bg-gray-800" : "bg-gray-50"
              }`}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type your message..."
                className={isDarkMode ? "text-gray-100" : "text-gray-800"}
                placeholderTextColor={isDarkMode ? "#9ca3af" : undefined}
                multiline
                maxLength={500}
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`p-2 rounded-full ${
                inputText.trim() && !isTyping
                  ? isDarkMode
                    ? "bg-emerald-700"
                    : "bg-emerald-600"
                  : isDarkMode
                  ? "bg-gray-700"
                  : "bg-gray-300"
              }`}
            >
              <Send
                size={20}
                color={inputText.trim() && !isTyping ? "#fff" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>

          {/* Chat Suggestions */}
          <View className="mt-3">
            <Text
              className={`text-xs font-medium mb-2 ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}
            >
              CHAT SUGGESTIONS
            </Text>
            <View className="flex-row flex-wrap">
              <TouchableOpacity
                onPress={() => handleSendMessage("Book Rx delivery")}
                className={`border rounded-full px-3 py-1 mr-2 mb-2 ${
                  isDarkMode
                    ? "bg-emerald-900/30 border-emerald-800"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  Book Rx delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book meal delivery")}
                className={`border rounded-full px-3 py-1 mr-2 mb-2 ${
                  isDarkMode
                    ? "bg-emerald-900/30 border-emerald-800"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  Book meal delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book fitness class")}
                className={`border rounded-full px-3 py-1 mr-2 mb-2 ${
                  isDarkMode
                    ? "bg-emerald-900/30 border-emerald-800"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  Book fitness class
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book supplement delivery")}
                className={`border rounded-full px-3 py-1 mr-2 mb-2 ${
                  isDarkMode
                    ? "bg-emerald-900/30 border-emerald-800"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
                  Book supplement delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book appointment")}
                className={`border rounded-full px-3 py-1 mb-2 ${
                  isDarkMode
                    ? "bg-emerald-900/30 border-emerald-800"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-emerald-300" : "text-emerald-800"
                  }`}
                >
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
