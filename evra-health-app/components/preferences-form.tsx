"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Heart, User, Target, AlertCircle } from "lucide-react"
import Link from "next/link"

export function PreferencesForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [preferences, setPreferences] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    activityLevel: "",
    healthGoals: [] as string[],
    medicalConditions: "",
    medications: "",
    allergies: "",
    emergencyContact: "",
    preferredDoctor: "",
  })

  const healthGoalOptions = [
    "Weight Management",
    "Fitness Improvement",
    "Better Sleep",
    "Stress Reduction",
    "Heart Health",
    "Diabetes Management",
    "Blood Pressure Control",
    "Mental Wellness",
  ]

  const handleGoalToggle = (goal: string) => {
    setPreferences((prev) => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter((g) => g !== goal)
        : [...prev.healthGoals, goal],
    }))
  }

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-700">Evra</h1>
        </div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Let's personalize your health journey</h2>
        <p className="text-gray-600">Help us understand your health profile to provide better recommendations</p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {step}
              </div>
              {step < 3 && <div className={`w-12 h-1 mx-2 ${step < currentStep ? "bg-emerald-500" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="w-5 h-5 text-emerald-600" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={preferences.age}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, age: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={preferences.gender}
                    onValueChange={(value) => setPreferences((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={preferences.height}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, height: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={preferences.weight}
                    onChange={(e) => setPreferences((prev) => ({ ...prev, weight: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity">Activity Level</Label>
                <Select
                  value={preferences.activityLevel}
                  onValueChange={(value) => setPreferences((prev) => ({ ...prev, activityLevel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                    <SelectItem value="light">Light (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                    <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                    <SelectItem value="very-active">Very Active (2x/day or intense exercise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-emerald-600" />
                <span>Health Goals</span>
              </CardTitle>
              <CardDescription>What would you like to focus on? (Select all that apply)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {healthGoalOptions.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={preferences.healthGoals.includes(goal)}
                      onCheckedChange={() => handleGoalToggle(goal)}
                    />
                    <Label htmlFor={goal} className="text-sm">
                      {goal}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 3 && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-emerald-600" />
                <span>Medical Information</span>
              </CardTitle>
              <CardDescription>Help us provide safer recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="conditions">Medical Conditions</Label>
                <Textarea
                  id="conditions"
                  placeholder="List any medical conditions (diabetes, hypertension, etc.)"
                  value={preferences.medicalConditions}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, medicalConditions: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  placeholder="List current medications and supplements"
                  value={preferences.medications}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, medications: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  placeholder="List any known allergies"
                  value={preferences.allergies}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, allergies: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input
                  id="emergency"
                  placeholder="Emergency contact name and phone"
                  value={preferences.emergencyContact}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, emergencyContact: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctor">Preferred Doctor</Label>
                <Input
                  id="doctor"
                  placeholder="Your primary care physician"
                  value={preferences.preferredDoctor}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, preferredDoctor: e.target.value }))}
                />
              </div>
            </CardContent>
          </>
        )}

        <div className="flex justify-between p-6 pt-0">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep}>
              Previous
            </Button>
          )}
          <div className="ml-auto">
            {currentStep < 3 ? (
              <Button onClick={nextStep} className="bg-emerald-500 hover:bg-emerald-600">
                Next
              </Button>
            ) : (
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <Link href="/dashboard">Complete Setup</Link>
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
