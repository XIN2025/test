import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Heart, Activity, Droplets, Moon, TrendingUp, TrendingDown } from "lucide-react"

const metrics = [
  {
    title: "Heart Rate",
    value: "72",
    unit: "bpm",
    icon: Heart,
    trend: "up",
    trendValue: "+2%",
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    title: "Steps Today",
    value: "8,432",
    unit: "steps",
    icon: Activity,
    trend: "up",
    trendValue: "+15%",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    progress: 84,
  },
  {
    title: "Hydration",
    value: "6.2",
    unit: "L",
    icon: Droplets,
    trend: "down",
    trendValue: "-5%",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50",
    progress: 62,
  },
  {
    title: "Sleep Quality",
    value: "7.5",
    unit: "hrs",
    icon: Moon,
    trend: "up",
    trendValue: "+8%",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    progress: 94,
  },
]

export function HealthMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <Card key={metric.title} className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
            <div className={`p-2 rounded-full ${metric.bgColor}`}>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline space-x-2">
              <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
              <div className="text-sm text-gray-500">{metric.unit}</div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div
                className={`flex items-center space-x-1 text-xs ${
                  metric.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {metric.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{metric.trendValue}</span>
              </div>
              <div className="text-xs text-gray-500">vs yesterday</div>
            </div>
            {metric.progress && (
              <div className="mt-3">
                <Progress value={metric.progress} className="h-2" />
                <div className="text-xs text-gray-500 mt-1">{metric.progress}% of daily goal</div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
