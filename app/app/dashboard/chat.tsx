import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// @ts-ignore
import { LinearGradient } from "expo-linear-gradient";
// @ts-ignore
import {
  Heart,
  MessageCircle,
  Activity,
  User,
  Bot,
  Send,
  Mic,
  Paperclip,
} from "lucide-react-native";
import Card from "@/components/ui/card";
// @ts-ignore
import { tw } from "nativewind";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  suggestions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello John! I'm your personal health coach. How are you feeling today?",
      sender: "bot",
      suggestions: [
        "I'm feeling great!",
        "A bit tired",
        "Having some concerns",
        "Just checking in",
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);
    setTimeout(() => {
      const botResponses = [
        {
          text: "That's wonderful to hear! Your positive energy is great for your overall health. Have you been keeping up with your daily water intake?",
          suggestions: [
            "Yes, drinking plenty!",
            "Need to drink more",
            "What's the recommended amount?",
          ],
        },
        {
          text: "I understand you're feeling tired. Let's look at some factors that might help. How was your sleep last night?",
          suggestions: [
            "Slept well",
            "Had trouble sleeping",
            "Woke up multiple times",
            "Less than 6 hours",
          ],
        },
        {
          text: "I'm here to help with any health concerns you have. What's been on your mind? Remember, for serious medical issues, please consult with your doctor.",
          suggestions: [
            "Feeling stressed",
            "Diet questions",
            "Exercise concerns",
            "Medication reminders",
          ],
        },
        {
          text: "Great to see you checking in! Regular communication helps me provide better health guidance. Based on your recent data, your heart rate and activity levels look good. Any specific areas you'd like to focus on today?",
          suggestions: [
            "Nutrition tips",
            "Exercise routine",
            "Sleep improvement",
            "Stress management",
          ],
        },
      ];
      const randomResponse =
        botResponses[Math.floor(Math.random() * botResponses.length)];
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse.text,
        sender: "bot",
        suggestions: randomResponse.suggestions,
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1200);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#ecfdf5", "#f0fdfa"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Fixed Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4 z-10">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
                <Bot size={20} color="#fff" />
              </View>
              <View>
                <Text className="font-semibold text-gray-800">
                  Health Coach AI
                </Text>
                <Text className="text-sm text-emerald-600">
                  Online • Ready to help
                </Text>
              </View>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={80}
        >
          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 py-4"
            contentContainerClassName="pb-4"
          >
            {messages.map((message) => (
              <View
                key={message.id}
                className={`flex ${
                  message.sender === "user" ? "items-end" : "items-start"
                } mb-3`}
              >
                <View
                  className={`flex-row items-start max-w-[80%] ${
                    message.sender === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <View
                    className={`w-8 h-8 rounded-full items-center justify-center ${
                      message.sender === "user"
                        ? "bg-emerald-600 ml-2"
                        : "bg-gray-200 mr-2"
                    }`}
                  >
                    {message.sender === "user" ? (
                      <User size={16} color="#fff" />
                    ) : (
                      <Bot size={16} color="#64748b" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Card
                      className={
                        message.sender === "user"
                          ? "bg-emerald-600"
                          : "bg-white border-gray-200 p-3"
                      }
                    >
                      <Text
                        className={`text-sm ${
                          message.sender === "user"
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        {message.text}
                      </Text>
                    </Card>
                    {message.suggestions && message.sender === "bot" && (
                      <View className="flex-row flex-wrap mt-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleSuggestionClick(suggestion)}
                            className="bg-white border border-emerald-200 rounded-full px-3 py-1 mr-2 mb-2"
                          >
                            <Text className="text-xs text-emerald-700">
                              {suggestion}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
            {isTyping && (
              <View className="flex-row items-center mb-3">
                <View className="w-8 h-8 bg-gray-200 rounded-full items-center justify-center mr-2">
                  <Bot size={16} color="#64748b" />
                </View>
                <Card className="p-3 bg-white">
                  <View className="flex-row space-x-1">
                    <View className="w-2 h-2 bg-gray-400 rounded-full" />
                    <View className="w-2 h-2 bg-gray-400 rounded-full" />
                    <View className="w-2 h-2 bg-gray-400 rounded-full" />
                  </View>
                </Card>
              </View>
            )}
          </ScrollView>
          {/* Input Area */}
          <View className="bg-white border-t border-gray-100 px-4 py-3">
            <View className="flex-row items-center">
              <TouchableOpacity className="p-2">
                <Paperclip size={18} color="#64748b" />
              </TouchableOpacity>
              <View className="flex-1 mx-2">
                <TextInput
                  placeholder="Type your message..."
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSendMessage(inputText)}
                  className="h-10 px-3 bg-gray-50 rounded-full border border-gray-200 text-gray-800"
                  returnKeyType="send"
                />
              </View>
              <TouchableOpacity
                onPress={() => handleSendMessage(inputText)}
                disabled={!inputText.trim()}
                className={`p-2 ${!inputText.trim() ? "opacity-50" : ""}`}
              >
                <Send size={18} color="#059669" />
              </TouchableOpacity>
              <TouchableOpacity className="p-2 ml-1">
                <Mic size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            {/* Quick Actions */}
            <View className="flex-row mt-3">
              <TouchableOpacity
                onPress={() => handleSendMessage("How's my health today?")}
                className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mr-2"
              >
                <Text className="text-xs text-emerald-700">Health Check</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  handleSendMessage("Any supplement recommendations?")
                }
                className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 mr-2"
              >
                <Text className="text-xs text-emerald-700">Supplements</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book a doctor appointment")}
                className="bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"
              >
                <Text className="text-xs text-emerald-700">
                  Book Appointment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
