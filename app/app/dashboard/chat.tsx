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
import Constants from "expo-constants";
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

interface UploadProgress {
  uploadId: string;
  filename: string;
  percentage: number;
  message: string;
  status: "processing" | "completed" | "failed";
  entitiesCount: number;
  relationshipsCount: number;
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
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadingFileId, setUploadingFileId] = useState<string | null>(null);
  const [uploadingUploadId, setUploadingUploadId] = useState<string | null>(
    null
  );
  const [lastSuccessUploadId, setLastSuccessUploadId] = useState<string | null>(
    null
  );
  const scrollViewRef = useRef<ScrollView>(null);

  // API Configuration
  const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, uploadProgress]);

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
    if (suggestion === "Upload a medical document") {
      handleDocumentUpload();
    } else {
      handleSendMessage(suggestion);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "text/plain",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        return file;
      }
      return null;
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Failed to pick document. Please try again.");
      return null;
    }
  };

  const uploadFileToServer = async (
    file: DocumentPicker.DocumentPickerAsset
  ) => {
    try {
      const formData = new FormData();

      // Use the File object for web, and uri for native
      if (file.file) {
        // Web: file.file is a real File object
        formData.append("file", file.file, file.name);
      } else {
        // Native: use uri
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);
      }

      const response = await fetch(`${API_BASE_URL}/upload/document`, {
        method: "POST",
        body: formData,
        // Do NOT set Content-Type here! The browser will set it with the correct boundary.
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result.upload_id;
    } catch (error) {
      console.error("Upload error details:", error);
      throw error;
    }
  };

  const monitorUploadProgress = async (uploadId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/upload/progress/${uploadId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to get progress: ${response.status}`);
      }

      const data = await response.json();
      return data.progress;
    } catch (error) {
      console.error("Progress monitoring error:", error);
      throw error;
    }
  };

  const handleDocumentUpload = async () => {
    try {
      // Step 1: Pick document
      const file = await pickDocument();
      if (!file) {
        return; // User cancelled
      }

      // Check if file is already being uploaded
      if (uploadingFileId === file.name) {
        Alert.alert(
          "Upload in Progress",
          "This file is already being uploaded. Please wait for it to complete."
        );
        return;
      }

      // Check if file is already uploaded
      if (uploadedFiles.some((f) => f.name === file.name)) {
        Alert.alert(
          "File Already Uploaded",
          "This file has already been uploaded."
        );
        return;
      }

      // Test if backend is reachable
      try {
        const testResponse = await fetch(`${API_BASE_URL}/`);
        console.log("Backend test response:", testResponse.status);
      } catch (testError) {
        console.error("Backend not reachable:", testError);
        Alert.alert(
          "Connection Error",
          "Cannot connect to the backend server. Please make sure the API server is running on port 8000."
        );
        return;
      }

      // Step 2: Start upload process
      setIsUploading(true);
      setUploadingFileId(file.name);
      setUploadingUploadId("temp-id"); // Use a temporary ID for monitoring
      setUploadProgress({
        uploadId: "temp-id",
        filename: file.name,
        percentage: 5,
        message: "Preparing file for upload...",
        status: "processing",
        entitiesCount: 0,
        relationshipsCount: 0,
      });

      // Step 3: Simulate file preparation
      await new Promise((resolve) => setTimeout(resolve, 500));
      setUploadProgress((prev) =>
        prev
          ? { ...prev, message: "Reading file content...", percentage: 10 }
          : null
      );

      // Step 4: Upload file to server
      await new Promise((resolve) => setTimeout(resolve, 300));
      setUploadProgress((prev) =>
        prev
          ? { ...prev, message: "Uploading file to server...", percentage: 15 }
          : null
      );

      const uploadId = await uploadFileToServer(file);

      setUploadingUploadId(uploadId);
      setUploadProgress((prev) =>
        prev
          ? {
            ...prev,
            uploadId,
            message: "File uploaded successfully, starting analysis...",
            percentage: 25,
          }
          : null
      );

      // Step 5: Monitor progress with enhanced messaging
      let successMessageAdded = false;
      const progressInterval = setInterval(async () => {
        try {
          const progress = await monitorUploadProgress(uploadId);

          // Enhanced progress messages based on percentage
          let enhancedMessage = progress.message;
          if (progress.percentage <= 30) {
            enhancedMessage = "Extracting text from document...";
          } else if (progress.percentage <= 50) {
            enhancedMessage = "Analyzing document structure...";
          } else if (progress.percentage <= 70) {
            enhancedMessage = "Identifying medical entities...";
          } else if (progress.percentage <= 90) {
            enhancedMessage = "Extracting relationships and connections...";
          } else if (progress.percentage < 100) {
            enhancedMessage = "Finalizing analysis...";
          }

          setUploadProgress((prev) =>
            prev
              ? {
                ...prev,
                percentage: progress.percentage,
                message: enhancedMessage,
                status: progress.status,
                entitiesCount: progress.entities_count || 0,
                relationshipsCount: progress.relationships_count || 0,
              }
              : null
          );

          // Stop monitoring if completed or failed
          if (progress.status === "completed" || progress.status === "failed") {
            clearInterval(progressInterval);
            setIsUploading(false);
            setUploadingFileId(null);
            setUploadingUploadId(null);

            if (progress.status === "completed") {
              // Show completion message briefly
              setUploadProgress((prev) =>
                prev
                  ? {
                    ...prev,
                    message:
                      "Analysis complete! Document processed successfully.",
                    percentage: 100,
                  }
                  : null
              );

              // Only add success message if we haven't already for this upload
              if (!successMessageAdded && lastSuccessUploadId !== uploadId) {
                setLastSuccessUploadId(uploadId);
                successMessageAdded = true;
                const successMessage: Message = {
                  id: generateUniqueId(),
                  text: `✅ Document uploaded successfully! I've analyzed your medical document and extracted ${progress.entities_count} entities and ${progress.relationships_count} relationships. You can now ask me questions about the content.`,
                  sender: "bot",
                  suggestions: [
                    "What entities were found?",
                    "Show me the relationships",
                    "Ask about specific content",
                  ],
                };
                setMessages((prev) => [...prev, successMessage]);
              }

              // Add to uploaded files list
              setUploadedFiles((prev) => {
                if (prev.some((f) => f.name === file.name)) return prev;
                return [
                  ...prev,
                  {
                    name: file.name,
                    type: file.mimeType || "unknown",
                    size: file.size || 0,
                  },
                ];
              });
            } else {
              // Add error message
              const errorMessage: Message = {
                id: generateUniqueId(),
                text: `❌ Document processing failed: ${progress.error_message || "Unknown error"
                  }`,
                sender: "bot",
              };
              setMessages((prev) => [...prev, errorMessage]);
            }

            // Clear progress after a delay
            setTimeout(() => {
              setUploadProgress(null);
            }, 3000);
          }
        } catch (error) {
          console.error("Progress monitoring error:", error);
          clearInterval(progressInterval);
          setIsUploading(false);
          setUploadingFileId(null);
          setUploadingUploadId(null);
          setUploadProgress(null);

          const errorMessage: Message = {
            id: generateUniqueId(),
            text: "❌ Error monitoring upload progress. Please try again.",
            sender: "bot",
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      }, 1000); // Check progress every second
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      setUploadingFileId(null);
      setUploadingUploadId(null);
      setUploadProgress(null);

      const errorMessage: Message = {
        id: generateUniqueId(),
        text: `❌ Upload failed: ${error instanceof Error ? error.message : "Unknown error"
          }. Please check if the backend server is running and try again.`,
        sender: "bot",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const removeUploadedFile = (fileName: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.name !== fileName));
  };

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

        {/* Uploaded Files Section */}
        {uploadedFiles.length > 0 && (
          <View className="bg-white border-b border-gray-100 px-4 py-2">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Uploaded Documents:
            </Text>
            {uploadedFiles.map((file, index) => (
              <View
                key={file.name + "-" + index}
                className="flex-row items-center justify-between bg-gray-50 rounded-lg p-2 mb-1"
              >
                <View className="flex-row items-center flex-1">
                  <FileText size={16} color="#114131" className="mr-2" />
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
              className={`mb-4 ${message.sender === "user" ? "items-end" : "items-start"
                }`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.sender === "user"
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
                    className={`text-sm ${message.sender === "user" ? "text-white" : "text-gray-800"
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
          {uploadProgress && (
            <View className="mb-4 items-start">
              <View className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-50 border border-blue-200">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-medium text-blue-800">
                    {uploadProgress.filename}
                  </Text>
                  <Text className="text-xs text-blue-600 font-semibold">
                    {uploadProgress.percentage}%
                  </Text>
                </View>

                <Text className="text-xs text-blue-700 mb-3 font-medium">
                  {uploadProgress.message}
                </Text>

                {/* Enhanced Progress Bar */}
                <View className="w-full bg-blue-200 rounded-full h-3 mb-3 overflow-hidden">
                  <View
                    className={`h-3 rounded-full transition-all duration-500 ease-out ${uploadProgress.status === "processing"
                      ? "bg-gradient-to-r from-blue-500 to-blue-600"
                      : uploadProgress.status === "completed"
                        ? "bg-gradient-to-r from-green-500 to-green-600"
                        : "bg-gradient-to-r from-red-500 to-red-600"
                      }`}
                    style={{
                      width: `${uploadProgress.percentage}%`,
                      shadowColor:
                        uploadProgress.status === "processing"
                          ? "#3b82f6"
                          : "#10b981",
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  />
                  {/* Pulsing effect during processing */}
                  {uploadProgress.status === "processing" &&
                    uploadProgress.percentage > 0 &&
                    uploadProgress.percentage < 100 && (
                      <View
                        className="absolute top-0 right-0 w-3 h-3 bg-white rounded-full opacity-70"
                        style={{
                          right: `${Math.max(
                            0,
                            100 - uploadProgress.percentage
                          )}%`,
                          transform: [{ translateX: 6 }],
                        }}
                      />
                    )}
                </View>

                {/* Stats with better styling */}
                {uploadProgress.entitiesCount > 0 && (
                  <View className="flex-row justify-between bg-blue-100 rounded-lg p-2 mb-2">
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                      <Text className="text-xs text-blue-700 font-medium">
                        Entities: {uploadProgress.entitiesCount}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                      <Text className="text-xs text-green-700 font-medium">
                        Relationships: {uploadProgress.relationshipsCount}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Enhanced Status Indicator */}
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className={`w-3 h-3 rounded-full mr-2 ${uploadProgress.status === "processing"
                        ? "bg-yellow-500 animate-pulse"
                        : uploadProgress.status === "completed"
                          ? "bg-green-500"
                          : "bg-red-500"
                        }`}
                    />
                    <Text
                      className={`text-xs font-medium capitalize ${uploadProgress.status === "processing"
                        ? "text-yellow-700"
                        : uploadProgress.status === "completed"
                          ? "text-green-700"
                          : "text-red-700"
                        }`}
                    >
                      {uploadProgress.status === "processing"
                        ? "Processing..."
                        : uploadProgress.status}
                    </Text>
                  </View>

                  {/* Processing indicator */}
                  {uploadProgress.status === "processing" && (
                    <View className="flex-row items-center">
                      <ActivityIndicator size="small" color="#3b82f6" />
                      <Text className="text-xs text-blue-600 ml-1">
                        Working...
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Section */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="bg-white border-t border-gray-100 px-4 py-4"
        >
          <View className="flex-row items-center">
            {/* Upload Button */}
            <TouchableOpacity
              onPress={handleDocumentUpload}
              disabled={isUploading}
              className="mr-3 p-2"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#114131" />
              ) : (
                <Upload size={24} color="#114131" />
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
                editable={!isUploading}
              />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              onPress={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isTyping || isUploading}
              className={`p-2 rounded-full ${inputText.trim() && !isTyping && !isUploading
                ? "bg-gray-300"
                : "bg-gray-300"
                }`}
              style={
                inputText.trim() && !isTyping && !isUploading
                  ? { backgroundColor: "#114131" }
                  : {}
              }
            >
              <Send
                size={20}
                color={
                  inputText.trim() && !isTyping && !isUploading
                    ? "#fff"
                    : "#9ca3af"
                }
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
                disabled={isUploading}
              >
                <Text
                  className={`text-xs ${isUploading ? "text-gray-400" : ""}`}
                  style={!isUploading ? { color: "#114131" } : {}}
                >
                  Book Rx delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book meal delivery")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
                disabled={isUploading}
              >
                <Text
                  className={`text-xs ${isUploading ? "text-gray-400" : ""}`}
                  style={!isUploading ? { color: "#114131" } : {}}
                >
                  Book meal delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book fitness class")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
                disabled={isUploading}
              >
                <Text
                  className={`text-xs ${isUploading ? "text-gray-400" : ""}`}
                  style={!isUploading ? { color: "#114131" } : {}}
                >
                  Book fitness class
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book supplement delivery")}
                className="border border-gray-200 rounded-full px-3 py-1 mr-2 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
                disabled={isUploading}
              >
                <Text
                  className={`text-xs ${isUploading ? "text-gray-400" : ""}`}
                  style={!isUploading ? { color: "#114131" } : {}}
                >
                  Book supplement delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleSendMessage("Book appointment")}
                className="border border-gray-200 rounded-full px-3 py-1 mb-2"
                style={{ backgroundColor: "#e6f4f1" }}
                disabled={isUploading}
              >
                <Text
                  className={`text-xs ${isUploading ? "text-gray-400" : ""}`}
                  style={!isUploading ? { color: "#114131" } : {}}
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
