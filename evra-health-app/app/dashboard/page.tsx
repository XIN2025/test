"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Heart,
  Activity,
  Moon,
  Droplets,
  MessageCircle,
  Calendar,
  Pill,
  TrendingUp,
  User,
  Settings,
  Bell,
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const healthMetrics = [
    { icon: Heart, label: "Heart Rate", value: "72 bpm", status: "normal", color: "text-red-500" },
    { icon: Activity, label: "Steps", value: "8,432", status: "good", color: "text-blue-500" },
    { icon: Moon, label: "Sleep", value: "7.5 hrs", status: "good", color: "text-purple-500" },
    { icon: Droplets, label: "Hydration", value: "6/8 glasses", status: "needs attention", color: "text-cyan-500" },
  ]

  const todaysTasks = [
    { task: "Take morning vitamins", completed: true },
    { task: "Drink 2 more glasses of water", completed: false },
    { task: "Evening walk (30 min)", completed: false },
    { task: "Log dinner", completed: false },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-sm mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-gray-800">Good morning, John!</h1>
                <p className="text-sm text-gray-600">Ready for a healthy day?</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="p-2">
                <Bell className="w-5 h-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-5 h-5 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-6">
        {/* Health Score */}
        <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Health Score</h3>
                <p className="text-emerald-100 text-sm">Based on your daily activities</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">85</div>
                <div className="text-emerald-100 text-sm">Good</div>
              </div>
            </div>
            <Progress value={85} className="mt-4 bg-emerald-400" />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/chat">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-0">
              <CardContent className="p-4 text-center">
                <MessageCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-800">Chat with AI Coach</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-0">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-800">Book Appointment</p>
            </CardContent>
          </Card>
        </div>

        {/* Health Metrics */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" />
              Today's Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  <span className="text-sm font-medium text-gray-700">{metric.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-800">{metric.value}</div>
                  <div
                    className={`text-xs ${
                      metric.status === "normal" || metric.status === "good" ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {metric.status}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Pill className="w-5 h-5 text-emerald-600 mr-2" />
              Today's Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysTasks.map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    item.completed ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                  }`}
                >
                  {item.completed && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
                <span className={`text-sm ${item.completed ? "text-gray-500 line-through" : "text-gray-800"}`}>
                  {item.task}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Insights */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-emerald-800 font-medium mb-1">Great progress on your sleep schedule! 🌙</p>
              <p className="text-xs text-emerald-700">
                You've maintained 7+ hours of sleep for 5 consecutive days. Keep it up!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-sm mx-auto px-4 py-2">
          <div className="flex justify-around">
            <Button variant="ghost" className="flex-col h-auto py-2 text-emerald-600">
              <Heart className="w-5 h-5 mb-1" />
              <span className="text-xs">Dashboard</span>
            </Button>
            <Link href="/chat">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <MessageCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">Chat</span>
              </Button>
            </Link>
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
