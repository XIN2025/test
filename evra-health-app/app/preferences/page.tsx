"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Heart, User, Target, Activity, Calendar } from "lucide-react"
import Link from "next/link"

export default function PreferencesPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [preferences, setPreferences] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "",
    healthGoals: [] as string[],
    medicalConditions: [] as string[],
    medications: "",
    preferredContactTime: "",
  })

  const healthGoals = [
    "Weight Management",
    "Fitness Improvement",
    "Better Sleep",
    "Stress Management",
    "Heart Health",
    "Diabetes Management",
    "Mental Wellness",
  ]

  const medicalConditions = [
    "Diabetes",
    "Hypertension",
    "Heart Disease",
    "Asthma",
    "Arthritis",
    "Anxiety/Depression",
    "None",
  ]

  const handleGoalToggle = (goal: string) => {
    setPreferences((prev) => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter((g) => g !== goal)
        : [...prev.healthGoals, goal],
    }))
  }

  const handleConditionToggle = (condition: string) => {
    setPreferences((prev) => ({
      ...prev,
      medicalConditions: prev.medicalConditions.includes(condition)
        ? prev.medicalConditions.filter((c) => c !== condition)
        : [...prev.medicalConditions, condition],
    }))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-800">Basic Information</h2>
              <p className="text-gray-600 text-sm">Help us understand you better</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    placeholder="25"
                    value={preferences.age}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, age: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={preferences.gender}
                    onValueChange={(value) => setPreferences((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    placeholder="170"
                    value={preferences.height}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, height: e.target.value }))}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    placeholder="70"
                    value={preferences.weight}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, weight: e.target.value }))}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Activity Level</Label>
                <RadioGroup
                  value={preferences.activityLevel}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, activityLevel: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sedentary" id="sedentary" />
                    <Label htmlFor="sedentary" className="text-sm">
                      Sedentary (little to no exercise)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="text-sm">
                      Light (1-3 days/week)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="moderate" id="moderate" />
                    <Label htmlFor="moderate" className="text-sm">
                      Moderate (3-5 days/week)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active" className="text-sm">
                      Very Active (6-7 days/week)
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Target className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-800">Health Goals</h2>
              <p className="text-gray-600 text-sm">What would you like to focus on?</p>
            </div>

            <div className="space-y-3">
              {healthGoals.map((goal) => (
                <div key={goal} className="flex items-center space-x-3">
                  <Checkbox
                    id={goal}
                    checked={preferences.healthGoals.includes(goal)}
                    onCheckedChange={() => handleGoalToggle(goal)}
                  />
                  <Label htmlFor={goal} className="text-sm font-medium">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Activity className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-800">Medical Information</h2>
              <p className="text-gray-600 text-sm">Help us provide better recommendations</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Do you have any of these conditions?</Label>
                {medicalConditions.map((condition) => (
                  <div key={condition} className="flex items-center space-x-3">
                    <Checkbox
                      id={condition}
                      checked={preferences.medicalConditions.includes(condition)}
                      onCheckedChange={() => handleConditionToggle(condition)}
                    />
                    <Label htmlFor={condition} className="text-sm font-medium">
                      {condition}
                    </Label>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Current Medications (Optional)</Label>
                <Input
                  placeholder="List any medications you're taking"
                  value={preferences.medications}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, medications: e.target.value }))}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-800">Preferences</h2>
              <p className="text-gray-600 text-sm">When would you like to receive health tips?</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Preferred Contact Time</Label>
                <RadioGroup
                  value={preferences.preferredContactTime}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, preferredContactTime: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="morning" id="morning" />
                    <Label htmlFor="morning" className="text-sm">
                      Morning (8:00 - 12:00)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="afternoon" id="afternoon" />
                    <Label htmlFor="afternoon" className="text-sm">
                      Afternoon (12:00 - 17:00)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="evening" id="evening" />
                    <Label htmlFor="evening" className="text-sm">
                      Evening (17:00 - 21:00)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="bg-emerald-50 p-4 rounded-lg">
                <h3 className="font-medium text-emerald-800 mb-2">You're all set!</h3>
                <p className="text-sm text-emerald-700">
                  Based on your preferences, we'll create a personalized health plan and connect you with our AI health
                  coach.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-full mb-3">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-800">Setup Your Profile</h1>

          {/* Progress Bar */}
          <div className="flex items-center justify-center mt-4 space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-2 h-2 rounded-full ${step <= currentStep ? "bg-emerald-600" : "bg-gray-300"}`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">Step {currentStep} of 4</p>
        </div>

        {/* Form */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            {renderStep()}

            <div className="flex gap-3 mt-8">
              {currentStep > 1 && (
                <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)} className="flex-1 h-12">
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                >
                  Continue
                </Button>
              ) : (
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700">Complete Setup</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
