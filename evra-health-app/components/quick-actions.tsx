import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Calendar, FileText, Pill } from "lucide-react"
import Link from "next/link"

const actions = [
  {
    title: "Chat with AI Coach",
    description: "Get health advice",
    icon: MessageCircle,
    href: "/chat",
    color: "bg-emerald-500 hover:bg-emerald-600",
  },
  {
    title: "Book Appointment",
    description: "Schedule with doctor",
    icon: Calendar,
    href: "/appointments",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    title: "Log Medication",
    description: "Track your pills",
    icon: Pill,
    href: "/medications",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    title: "Upload Document",
    description: "Add health records",
    icon: FileText,
    href: "/records",
    color: "bg-orange-500 hover:bg-orange-600",
  },
]

export function QuickActions() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-center space-y-2 hover:shadow-md transition-shadow bg-transparent"
              >
                <action.icon className="w-6 h-6 text-gray-600" />
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">{action.title}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
