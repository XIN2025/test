import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // API Configuration
  const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

  // Get user's email from context
  const { user } = useAuth();
  const userEmail = user?.email || "";

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

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  // Removed document upload logic

  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView>
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View>
          {/* Header */}
          <View
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderBottomWidth: 1,
              borderBottomColor: isDarkMode ? "#374151" : "#e5e7eb",
              backgroundColor: isDarkMode ? "#111827" : "#ffffff",
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                  }}
                >
                  <MessageCircle size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                      marginBottom: 2,
                    }}
                  >
                    AI Health Agent
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDarkMode ? "#9ca3af" : "#6b7280",
                    }}
                  >
                    Chat with Evra • Get health insights
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Removed Uploaded Files Section */}

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            style={{ backgroundColor: isDarkMode ? "#111827" : "#F0FDF4", height: "90%" }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 16,
              paddingVertical: 16,
              paddingBottom: messages.length === 0 ? 16 : 120,
              justifyContent: messages.length === 0 ? "center" : "flex-start",
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              // Empty state - centered placeholder
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 32,
                }}
              >
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 24,
                    backgroundColor: isDarkMode ? "#1f6f51" : "#114131",
                  }}
                >
                  <MessageCircle size={40} color="#fff" />
                </View>
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "600",
                    color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  How can I help you?
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                    textAlign: "center",
                    lineHeight: 24,
                    maxWidth: 300,
                  }}
                >
                  I&apos;m your AI health assistant. Ask me about nutrition, exercise, medications, or any
                  health-related questions.
                </Text>
              </View>
            ) : (
              // Messages list
              messages.map((message) => (
                <View
                  key={message.id}
                  style={{
                    marginBottom: 16,
                    alignItems: message.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      maxWidth: "85%",
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor:
                        message.sender === "user"
                          ? isDarkMode
                            ? "#064e3b"
                            : "#059669"
                          : isDarkMode
                          ? "#1f2937"
                          : "#ffffff",
                      borderWidth: message.sender === "bot" ? 1 : 0,
                      borderColor: isDarkMode ? "#374151" : "#e5e7eb",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: isDarkMode ? 0.3 : 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    {message.isLoading ? (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <ActivityIndicator size="small" color={isDarkMode ? "#34d399" : "#114131"} />
                        <Text
                          style={{
                            marginLeft: 8,
                            fontSize: 14,
                            color: isDarkMode ? "#d1d5db" : "#6b7280",
                          }}
                        >
                          AI is thinking...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          fontSize: 15,
                          lineHeight: 22,
                          color: message.sender === "user" ? "#ffffff" : isDarkMode ? "#f3f4f6" : "#1f2937",
                        }}
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
                      <View style={{ marginTop: 12, flexDirection: "row", flexWrap: "wrap" }}>
                        {message.suggestions.map((suggestion, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => handleSuggestionClick(suggestion)}
                            style={{
                              borderWidth: 1,
                              borderRadius: 20,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              marginRight: 8,
                              marginBottom: 8,
                              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                              borderColor: isDarkMode ? "#374151" : "#d1d5db",
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: isDarkMode ? 0.2 : 0.05,
                              shadowRadius: 1,
                              elevation: 1,
                            }}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                color: isDarkMode ? "#d1d5db" : "#374151",
                                fontWeight: "500",
                              }}
                            >
                              {suggestion}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      {/* Input Section - Absolutely positioned outside TouchableWithoutFeedback */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        }}
      >
        <TouchableWithoutFeedback>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: isDarkMode ? "#374151" : "#e5e7eb",
              backgroundColor: isDarkMode ? "#111827" : "#ffffff",
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: Platform.OS === "ios" ? 32 : 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: isDarkMode ? 0.3 : 0.1,
              shadowRadius: 4,
              elevation: 5,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end", minHeight: 48 }}>
              {/* Text Input */}
              <View
                style={{
                  flex: 1,
                  borderRadius: 24,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 12,
                  backgroundColor: isDarkMode ? "#1f2937" : "#f9fafb",
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#374151" : "#d1d5db",
                  minHeight: 48,
                  maxHeight: 120,
                  justifyContent: "center",
                }}
              >
                <TextInput
                  ref={inputRef}
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  style={{
                    fontSize: 16,
                    color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    textAlignVertical: "top",
                    paddingVertical: 8,
                    minHeight: 32,
                    maxHeight: 88,
                  }}
                  placeholderTextColor={isDarkMode ? "#9ca3af" : "#6b7280"}
                  multiline
                  maxLength={500}
                  scrollEnabled={false}
                  blurOnSubmit={false}
                  returnKeyType="default"
                  enablesReturnKeyAutomatically={false}
                />
              </View>

              {/* Send Button */}
              <TouchableOpacity
                onPress={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: inputText.trim() && !isTyping ? "#10b981" : isDarkMode ? "#374151" : "#d1d5db",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
                activeOpacity={0.7}
              >
                <Send size={20} color={inputText.trim() && !isTyping ? "#fff" : "#9ca3af"} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
