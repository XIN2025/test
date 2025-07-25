"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Heart, Mic, Paperclip, MoreVertical } from "lucide-react"

interface Message {
  id: number
  sender: "user" | "ai"
  content: string
  timestamp: string
  type?: "text" | "suggestion" | "health-tip"
}

const initialMessages: Message[] = [
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
]

const quickSuggestions = [
  "How's my health today?",
  "Suggest a workout",
  "Check my medication schedule",
  "Book a doctor appointment",
  "Analyze my sleep pattern",
]

export function HealthChatInterface() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)

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

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)]">
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        <Card className="border-0 shadow-sm mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Evra Health Coach</CardTitle>
                  <p className="text-sm text-gray-600">Your personal medical assistant</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Online
                </Badge>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="flex-1 border-0 shadow-sm">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex items-start space-x-2 max-w-[80%] ${
                      message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8">
                      {message.sender === "ai" ? (
                        <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                          <Heart className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <>
                          <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
                          <AvatarFallback>JD</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                    <div
                      className={`rounded-lg p-3 ${
                        message.sender === "user"
                          ? "bg-emerald-500 text-white"
                          : message.type === "suggestion"
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-gray-100"
                      }`}
                    >
                      <p className={`text-sm ${message.sender === "user" ? "text-white" : "text-gray-800"}`}>
                        {message.content}
                      </p>
                      <p className={`text-xs mt-1 ${message.sender === "user" ? "text-emerald-100" : "text-gray-500"}`}>
                        {message.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <Avatar className="w-8 h-8">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                    </Avatar>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Suggestions */}
            <div className="border-t p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                {quickSuggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask about your health, symptoms, or get recommendations..."
                    className="pr-12"
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  className="bg-emerald-500 hover:bg-emerald-600"
                  disabled={!inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
