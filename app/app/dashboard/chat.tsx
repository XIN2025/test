import React, { useState, useRef, useEffect } from "react";
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
  Upload,
  FileText,
  X,
} from "lucide-react-native";
import Card from "@/components/ui/card";
// @ts-ignore
import { tw } from "nativewind";
import * as DocumentPicker from "expo-document-picker";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  suggestions?: string[];
  isLoading?: boolean;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI health assistant. I can help you with health-related questions and analyze documents you upload. How can I assist you today?",
      sender: "bot",
      suggestions: [
        "Tell me about nutrition",
        "Upload a medical document",
        "How to improve sleep?",
        "What exercises are good for me?",
      ],
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const API_BASE_URL = "http://localhost:8000"; // Update with your API URL

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "",
      sender: "bot",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const formData = new FormData();
      formData.append("message", text.trim());

      const response = await fetch(`${API_BASE_URL}/chat/send`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Remove loading message and add response
        setMessages((prev) => prev.filter((msg) => !msg.isLoading));

        const botMessage: Message = {
          id: (Date.now() + 2).toString(),
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
        id: (Date.now() + 2).toString(),
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

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "text/plain"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      // Validate file size (10MB limit)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert(
          "File too large",
          "Please select a file smaller than 10MB."
        );
        return;
      }

      setIsUploading(true);

      // Read the file content
      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();

      const formData = new FormData();
      formData.append("file", blob, file.name);

      const response = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Add uploaded file to list
        setUploadedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.mimeType || "unknown",
            size: file.size || 0,
          },
        ]);

        // Add success message
        const successMessage: Message = {
          id: Date.now().toString(),
          text: `✅ Document "${file.name}" uploaded and processed successfully!\n\nFound ${data.entities_count} entities and ${data.relationships_count} relationships. You can now ask questions about this document.`,
          sender: "bot",
          suggestions: [
            "What entities were found?",
            "Tell me about the relationships",
            "Ask a question about the document",
          ],
        };
        setMessages((prev) => [...prev, successMessage]);

        Alert.alert(
          "Success",
          `Document processed successfully!\nEntities: ${data.entities_count}\nRelationships: ${data.relationships_count}`
        );
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to upload document. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeUploadedFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

  return (
    <SafeAreaView className="flex-1">
      <LinearGradient
        colors={["#ecfdf5", "#f0fdfa"]}
        className="flex-1"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View className="bg-white shadow-sm border-b border-gray-100 px-4 py-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-emerald-600 rounded-full items-center justify-center mr-3">
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

        {/* Uploaded Files Section */}
        {uploadedFiles.length > 0 && (
          <View className="bg-white border-b border-gray-100 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Uploaded Documents:
            </Text>
            {uploadedFiles.map((file, index) => (
              <View
                key={index}
                className="flex-row items-center justify-between bg-gray-50 rounded-lg p-2 mb-1"
              >
                <View className="flex-row items-center flex-1">
                  <FileText size={16} color="#059669" className="mr-2" />
                  <Text
                    className="text-sm text-gray-700 flex-1"
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeUploadedFile(file.name)}
                  className="ml-2"
                >
                  <X size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

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
                    ? "bg-emerald-600"
                    : "bg-white shadow-sm border border-gray-100"
                }`}
              >
                {message.isLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#059669" />
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
        </ScrollView>

        {/* Input Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white border-t border-gray-100 px-4 py-4"
        >
          <View className="flex-row items-center">
            {/* Upload Button */}
            <TouchableOpacity
              onPress={handleFileUpload}
              disabled={isUploading}
              className="mr-3 p-2"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Upload size={24} color="#059669" />
              )}
            </TouchableOpacity>

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
                inputText.trim() && !isTyping ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <Send
                size={20}
                color={inputText.trim() && !isTyping ? "#fff" : "#9ca3af"}
              />
            </TouchableOpacity>
          </View>

          {/* Upload Status */}
          {isUploading && (
            <View className="mt-2 flex-row items-center">
              <ActivityIndicator size="small" color="#059669" />
              <Text className="text-sm text-gray-600 ml-2">
                Processing document...
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}
