"use client"

import { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

interface Message {
  id: number
  sender: "user" | "ai"
  content: string
  timestamp: string
  type?: "text" | "suggestion" | "health-tip"
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "ai",
      content:
        "Hello John! I'm your personal health coach. How are you feeling today? I noticed your heart rate was slightly elevated this morning - would you like to talk about it?",
      timestamp: "10:30 AM",
      type: "text",
    },
    {
      id: 2,
      sender: "user",
      content:
        "Hi! I'm feeling okay, but I did have a stressful morning at work. That might explain the elevated heart rate.",
      timestamp: "10:32 AM",
      type: "text",
    },
    {
      id: 3,
      sender: "ai",
      content:
        "I understand work stress can definitely impact your heart rate. Based on your profile, I'd recommend some breathing exercises. Would you like me to guide you through a 5-minute relaxation technique?",
      timestamp: "10:33 AM",
      type: "suggestion",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const quickSuggestions = [
    "How's my health today?",
    "Suggest a workout",
    "Check my medication schedule",
    "Book a doctor appointment",
    "Analyze my sleep pattern",
  ]

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        sender: "ai",
        content:
          "I understand your concern. Based on your recent health data, I can provide some personalized recommendations. Let me analyze your patterns and get back to you with specific advice.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: "text",
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 2000)
  }

  const handleSuggestionPress = (suggestion: string) => {
    setInputValue(suggestion)
  }

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === "user" ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === "user" ? styles.userMessage : styles.aiMessage,
          item.type === "suggestion" && styles.suggestionMessage,
        ]}
      >
        <Text style={[styles.messageText, item.sender === "user" ? styles.userMessageText : styles.aiMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, item.sender === "user" ? styles.userMessageTime : styles.aiMessageTime]}>
          {item.timestamp}
        </Text>
      </View>
    </View>
  )

  const renderTypingIndicator = () => (
    <View style={styles.aiMessageContainer}>
      <View style={[styles.messageBubble, styles.aiMessage]}>
        <View style={styles.typingIndicator}>
          <View style={[styles.typingDot, { animationDelay: "0ms" }]} />
          <View style={[styles.typingDot, { animationDelay: "150ms" }]} />
          <View style={[styles.typingDot, { animationDelay: "300ms" }]} />
        </View>
      </View>
    </View>
  )

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true })
  }, [messages, isTyping])

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiAvatar}>
              <Ionicons name="heart" size={20} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Evra Health Coach</Text>
              <Text style={styles.headerSubtitle}>Your personal medical assistant</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineText}>Online</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          ListFooterComponent={isTyping ? renderTypingIndicator : null}
        />

        {/* Quick Suggestions */}
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={quickSuggestions}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestionChip} onPress={() => handleSuggestionPress(item)}>
                <Text style={styles.suggestionText}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsContent}
          />
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Ask about your health, symptoms, or get recommendations..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={500}
          />
          <TouchableOpacity style={styles.micButton}>
            <Ionicons name="mic" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sendButton, !inputValue.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputValue.trim()}
          >
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  onlineText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
  },
  moreButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: "flex-end",
  },
  aiMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: "#10B981",
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestionMessage: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: "white",
  },
  aiMessageText: {
    color: "#1F2937",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  aiMessageTime: {
    color: "#9CA3AF",
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 2,
  },
  suggestionsContainer: {
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  suggestionsContent: {
    paddingHorizontal: 20,
  },
  suggestionChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestionText: {
    fontSize: 14,
    color: "#374151",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    maxHeight: 100,
  },
  micButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: "#10B981",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
})

export default ChatScreen
