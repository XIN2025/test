"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Send, Bot, User, Mic, Paperclip, MoreVertical, Heart, MessageCircle, Activity } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  text: string
  sender: "user" | "bot"
  timestamp: Date
  suggestions?: string[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello John! I'm your personal health coach. How are you feeling today?",
      sender: "bot",
      timestamp: new Date(),
      suggestions: ["I'm feeling great!", "A bit tired", "Having some concerns", "Just checking in"],
    },
  ])
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputText("")
    setIsTyping(true)

    // Simulate bot response
    setTimeout(() => {
      const botResponses = [
        {
          text: "That's wonderful to hear! Your positive energy is great for your overall health. Have you been keeping up with your daily water intake?",
          suggestions: ["Yes, drinking plenty!", "Need to drink more", "What's the recommended amount?"],
        },
        {
          text: "I understand you're feeling tired. Let's look at some factors that might help. How was your sleep last night?",
          suggestions: ["Slept well", "Had trouble sleeping", "Woke up multiple times", "Less than 6 hours"],
        },
        {
          text: "I'm here to help with any health concerns you have. What's been on your mind? Remember, for serious medical issues, please consult with your doctor.",
          suggestions: ["Feeling stressed", "Diet questions", "Exercise concerns", "Medication reminders"],
        },
        {
          text: "Great to see you checking in! Regular communication helps me provide better health guidance. Based on your recent data, your heart rate and activity levels look good. Any specific areas you'd like to focus on today?",
          suggestions: ["Nutrition tips", "Exercise routine", "Sleep improvement", "Stress management"],
        },
      ]

      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)]

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: randomResponse.text,
        sender: "bot",
        timestamp: new Date(),
        suggestions: randomResponse.suggestions,
      }

      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 1500)
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-sm mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-800">Health Coach AI</h1>
                  <p className="text-sm text-emerald-600">Online • Ready to help</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-2">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`flex items-start space-x-2 max-w-[80%] ${message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === "user" ? "bg-emerald-600" : "bg-gray-200"
                  }`}
                >
                  {message.sender === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="space-y-2">
                  <Card
                    className={`p-3 ${
                      message.sender === "user" ? "bg-emerald-600 text-white" : "bg-white border-gray-200"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                  </Card>

                  {message.suggestions && message.sender === "bot" && (
                    <div className="space-y-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs h-8 bg-white hover:bg-emerald-50 border-emerald-200 text-emerald-700"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-gray-600" />
                </div>
                <Card className="p-3 bg-white">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t shadow-lg">
        <div className="max-w-sm mx-auto p-4">
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 text-gray-500">
              <Paperclip className="w-5 h-5" />
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage(inputText)}
                className="pr-12 h-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
              />
              <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-gray-500">
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex space-x-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage("How's my health today?")}
              className="text-xs h-8 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              Health Check
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage("Any supplement recommendations?")}
              className="text-xs h-8 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              Supplements
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendMessage("Book a doctor appointment")}
              className="text-xs h-8 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              Book Appointment
            </Button>
          </div>
        </div>
      </div>
      {/* Bottom Navigation - Add this at the end of the component, before the closing div */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-sm mx-auto px-4 py-2">
          <div className="flex justify-around">
            <Link href="/dashboard">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <Heart className="w-5 h-5 mb-1" />
                <span className="text-xs">Dashboard</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex-col h-auto py-2 text-emerald-600">
              <MessageCircle className="w-5 h-5 mb-1" />
              <span className="text-xs">Chat</span>
            </Button>
            <Link href="/activity">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <Activity className="w-5 h-5 mb-1" />
                <span className="text-xs">Activity</span>
              </Button>
            </Link>
            <Link href="/profile">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <User className="w-5 h-5 mb-1" />
                <span className="text-xs">Profile</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
