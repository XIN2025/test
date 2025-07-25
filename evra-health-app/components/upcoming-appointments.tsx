import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Video } from "lucide-react"

const appointments = [
  {
    id: 1,
    doctor: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    date: "Tomorrow",
    time: "10:30 AM",
    type: "in-person",
    location: "Medical Center",
  },
  {
    id: 2,
    doctor: "Dr. Michael Chen",
    specialty: "General Practitioner",
    date: "Friday",
    time: "2:00 PM",
    type: "video",
    location: "Video Call",
  },
]

export function UpcomingAppointments() {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Upcoming Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{appointment.doctor}</h4>
                  <p className="text-sm text-gray-600">{appointment.specialty}</p>
                </div>
                <div className="flex items-center space-x-1 text-emerald-600">
                  {appointment.type === "video" ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{appointment.date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{appointment.time}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{appointment.location}</span>
                <Button size="sm" variant="outline">
                  {appointment.type === "video" ? "Join Call" : "View Details"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4 bg-transparent">
          View All Appointments
        </Button>
      </CardContent>
    </Card>
  )
}
