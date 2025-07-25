"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Heart,
  Activity,
  User,
  MessageCircle,
  ArrowLeft,
  Edit3,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  LogOut,
  Camera,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Stethoscope,
  Pill,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [notifications, setNotifications] = useState({
    healthReminders: true,
    medicationAlerts: true,
    appointmentReminders: true,
    weeklyReports: false,
  })

  const userInfo = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, NY",
    dateOfBirth: "January 15, 1990",
    bloodType: "O+",
    height: "5'10\"",
    weight: "175 lbs",
    emergencyContact: "Jane Doe - (555) 987-6543",
  }

  const healthData = {
    lastCheckup: "March 15, 2024",
    nextAppointment: "June 20, 2024",
    currentMedications: ["Vitamin D3", "Omega-3", "Multivitamin"],
    allergies: ["Peanuts", "Shellfish"],
    chronicConditions: ["None"],
  }

  const menuItems = [
    {
      icon: FileText,
      title: "Health Records",
      description: "View your medical history",
      action: () => {},
    },
    {
      icon: Stethoscope,
      title: "Doctor Appointments",
      description: "Manage your appointments",
      action: () => {},
    },
    {
      icon: Pill,
      title: "Medications",
      description: "Track your medications",
      action: () => {},
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Manage your alerts",
      action: () => {},
    },
    {
      icon: Shield,
      title: "Privacy & Security",
      description: "Control your data",
      action: () => {},
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      description: "Get help and contact us",
      action: () => {},
    },
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
                <h1 className="text-xl font-semibold text-gray-800">Profile</h1>
                <p className="text-sm text-gray-600">Manage your account</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="p-2" onClick={() => setIsEditing(!isEditing)}>
              <Edit3 className="w-5 h-5 text-gray-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto p-4 space-y-6">
        {/* Profile Header */}
        <Card className="border-0">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="/placeholder.svg?height=80&width=80" />
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 text-xl font-semibold">JD</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 p-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800">{userInfo.name}</h2>
                <p className="text-sm text-gray-600 mb-2">{userInfo.email}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center">
                    <MapPin className="w-3 h-3 mr-1" />
                    {userInfo.location}
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Age 34
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Summary */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Heart className="w-5 h-5 text-emerald-600 mr-2" />
              Health Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Height</p>
                <p className="font-medium text-gray-800">{userInfo.height}</p>
              </div>
              <div>
                <p className="text-gray-600">Weight</p>
                <p className="font-medium text-gray-800">{userInfo.weight}</p>
              </div>
              <div>
                <p className="text-gray-600">Blood Type</p>
                <p className="font-medium text-gray-800">{userInfo.bloodType}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Checkup</p>
                <p className="font-medium text-gray-800">{healthData.lastCheckup}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Medications</p>
                <div className="flex flex-wrap gap-2">
                  {healthData.currentMedications.map((med, index) => (
                    <span key={index} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                      {med}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Allergies</p>
                <div className="flex flex-wrap gap-2">
                  {healthData.allergies.map((allergy, index) => (
                    <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        {isEditing && (
          <Card className="border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="email" defaultValue={userInfo.email} className="pl-10 h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input id="phone" defaultValue={userInfo.phone} className="pl-10 h-11" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input id="emergency" defaultValue={userInfo.emergencyContact} className="h-11" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}
        <Card className="border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Bell className="w-5 h-5 text-emerald-600 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}
                  </p>
                  <p className="text-xs text-gray-600">
                    {key === "healthReminders" && "Daily health tips and reminders"}
                    {key === "medicationAlerts" && "Medication time alerts"}
                    {key === "appointmentReminders" && "Upcoming appointment alerts"}
                    {key === "weeklyReports" && "Weekly health summary reports"}
                  </p>
                </div>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Menu Items */}
        <Card className="border-0">
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={index}>
                <button
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-800">{item.title}</p>
                      <p className="text-xs text-gray-600">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Card className="border-0">
          <CardContent className="p-4">
            <Link href="/">
              <Button
                variant="outline"
                className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 bg-transparent"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* App Version */}
        <div className="text-center">
          <p className="text-xs text-gray-500">Evra Health Coach v1.2.0</p>
        </div>
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
            <Link href="/activity">
              <Button variant="ghost" className="flex-col h-auto py-2">
                <Activity className="w-5 h-5 mb-1" />
                <span className="text-xs">Activity</span>
              </Button>
            </Link>
            <Button variant="ghost" className="flex-col h-auto py-2 text-emerald-600">
              <User className="w-5 h-5 mb-1" />
              <span className="text-xs">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
