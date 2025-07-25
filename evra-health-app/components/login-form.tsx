"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Heart, Mail, Lock, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  return (
    <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur">
      <CardHeader className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-emerald-700">Evra</h1>
        </div>
        <CardTitle className="text-xl text-gray-800">Welcome back</CardTitle>
        <CardDescription className="text-gray-600">Sign in to your personal health coach</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Link href="#" className="text-sm text-emerald-600 hover:text-emerald-700">
            Forgot password?
          </Link>
        </div>
        <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
          <Link href="/dashboard" className="w-full">
            Sign In
          </Link>
        </Button>
        <Separator />
        <Button variant="outline" className="w-full border-gray-200 hover:bg-gray-50 bg-transparent">
          Continue with Google
        </Button>
      </CardContent>
      <CardFooter className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
