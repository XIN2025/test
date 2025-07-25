import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Heart, Pill, Calendar } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "exercise",
    title: "Morning Run",
    description: "5.2 km in 28 minutes",
    time: "2 hours ago",
    icon: Activity,
    color: "bg-blue-500",
  },
  {
    id: 2,
    type: "medication",
    title: "Medication Taken",
    description: "Vitamin D supplement",
    time: "4 hours ago",
    icon: Pill,
    color: "bg-green-500",
  },
  {
    id: 3,
    type: "vitals",
    title: "Blood Pressure Reading",
    description: "120/80 mmHg - Normal",
    time: "6 hours ago",
    icon: Heart,
    color: "bg-red-500",
  },
  {
    id: 4,
    type: "appointment",
    title: "Appointment Scheduled",
    description: "Dr. Smith - Cardiology checkup",
    time: "1 day ago",
    icon: Calendar,
    color: "bg-purple-500",
  },
]

export function RecentActivity() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${activity.color}`}>
                <activity.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
