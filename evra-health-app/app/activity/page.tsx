"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Heart,
  Activity,
  User,
  MessageCircle,
  ArrowLeft,
  Target,
  Flame,
  Clock,
  TrendingUp,
  Calendar,
  Award,
  Footprints,
  Zap,
} from "lucide-react"
import Link from "next/link"

export default function ActivityPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("today")

  const todayStats = {
    steps: { current: 8432, goal: 10000, unit: "steps" },
    calories: { current: 420, goal: 600, unit: "kcal" },
    activeMinutes: { current: 45, goal: 60, unit: "min" },
    distance: { current: 6.2, goal: 8.0, unit: "km" },
  }

  const weeklyProgress = [
    { day: "Mon", steps: 9200, active: true },
    { day: "Tue", steps: 7800, active: false },
    { day: "Wed", steps: 10500, active: true },
    { day: "Thu", steps: 8900, active: true },
    { day: "Fri", steps: 6200, active: false },
    { day: "Sat", steps: 11200, active: true },
    { day: "Sun", steps: 8432, active: true },
  ]

  const recentActivities = [
    {
      type: "Walking",
      duration: "32 min",
      calories: 180,
      time: "2 hours ago",
      icon: Footprints,
      color: "text-blue-500",
    },
    {
      type: "Yoga",
      duration: "25 min",
      calories: 95,
      time: "This morning",
      icon: Activity,
      color: "text-purple-500",
    },
    {
      type: "Cycling",
      duration: "45 min",
      calories: 320,
      time: "Yesterday",
      icon: Zap,
      color: "text-green-500",
    },
  ]

  const achievements = [
    { title: "Step Master", description: "10,000 steps in a day", earned: true },
    { title: "Weekly Warrior", description: "Active 5 days this week", earned: true },
    { title: "Calorie Crusher", description: "Burn 500+ calories", earned: false },
    { title: "Consistency King", description: "30 days streak", earned: false },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 pb-20">
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
              <div>
                <h1 className="text-xl font-semibold text-gray-800">Activity</h1>
                <p className="text-sm text-gray-600">Track your daily progress</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-2">
              <Calendar className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-6">
        {/* Period Selector */}
        <div className="flex space-x-2">
          {["today", "week", "month"].map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={`flex-1 h-9 ${selectedPeriod === period ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Button>
          ))}
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Footprints className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-500">
                  {Math.round((todayStats.steps.current / todayStats.steps.goal) * 100)}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">{todayStats.steps.current.toLocaleString()}</p>
                <p className="text-xs text-gray-600">of {todayStats.steps.goal.toLocaleString()} steps</p>
                <Progress value={(todayStats.steps.current / todayStats.steps.goal) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-xs text-gray-500">
                  {Math.round((todayStats.calories.current / todayStats.calories.goal) * 100)}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">{todayStats.calories.current}</p>
                <p className="text-xs text-gray-600">of {todayStats.calories.goal} kcal</p>
                <Progress value={(todayStats.calories.current / todayStats.calories.goal) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-green-500" />
                <span className="text-xs text-gray-500">
                  {Math.round((todayStats.activeMinutes.current / todayStats.activeMinutes.goal) * 100)}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">{todayStats.activeMinutes.current}</p>
                <p className="text-xs text-gray-600">of {todayStats.activeMinutes.goal} min</p>
                <Progress
                  value={(todayStats.activeMinutes.current / todayStats.activeMinutes.goal) * 100}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-purple-500" />
                <span className="text-xs text-gray-500">
                  {Math.round((todayStats.distance.current / todayStats.distance.goal) * 100)}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-800">{todayStats.distance.current}</p>
                <p className="text-xs text-gray-600">of {todayStats.distance.goal} km</p>
                <Progress value={(todayStats.distance.current / todayStats.distance.goal) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress Chart */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" />
              Weekly Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between h-32 mb-4">
              {weeklyProgress.map((day, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div
                    className={`w-6 rounded-t ${day.active ? "bg-emerald-500" : "bg-gray-300"}`}
                    style={{
                      height: `${(day.steps / 12000) * 100}px`,
                      minHeight: "20px",
                    }}
                  />
                  <span className="text-xs text-gray-600">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Average: 9,176 steps/day</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center`}>
                    <activity.icon className={`w-5 h-5 ${activity.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{activity.type}</p>
                    <p className="text-xs text-gray-600">{activity.time}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800">{activity.duration}</p>
                  <p className="text-xs text-gray-600">{activity.calories} kcal</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Award className="w-5 h-5 text-emerald-600 mr-2" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    achievement.earned ? "bg-emerald-100" : "bg-gray-100"
                  }`}
                >
                  <Award className={`w-5 h-5 ${achievement.earned ? "text-emerald-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${achievement.earned ? "text-gray-800" : "text-gray-500"}`}>
                    {achievement.title}
                  </p>
                  <p className="text-xs text-gray-600">{achievement.description}</p>
                </div>
                {achievement.earned && (
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-sm mx-auto px-4 py-2">
          <div className="flex justify-around">
            <Link href="/dashboard">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <Heart className="w-5 h-5 mb-1" />
                <span className="text-xs">Dashboard</span>
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <MessageCircle className="w-5 h-5 mb-1" />
                <span className="text-xs">Chat</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex-col h-auto py-2 text-emerald-600">
              <Activity className="w-5 h-5 mb-1" />
              <span className="text-xs">Activity</span>
            </Button>
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
