import { ArrowDown, ArrowUp } from "lucide-react"
import { SparklineChart } from "./sparkline-chart"
import { Card, CardContent } from "@/components/ui/card"

interface CryptoCardProps {
  symbol: string
  price: number
  change: number
  sparklineData?: number[]
}

export function CryptoCard({ symbol, price, change, sparklineData = [] }: CryptoCardProps) {
  // Generate random sparkline data if none provided
  const chartData =
    sparklineData.length > 0 ? sparklineData : Array.from({ length: 20 }, (_, i) => Math.random() * 10 + 90)

  const isPositive = change >= 0
  const formattedPrice = formatPrice(price)
  const formattedChange = Math.abs(change).toFixed(2)

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="font-bold">{symbol}</span>
          <span className={isPositive ? "text-green-500" : "text-red-500"}>
            {isPositive ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </span>
        </div>

        <div className="text-2xl font-bold mb-1">${formattedPrice}</div>

        <div className="flex justify-between items-center">
          <span className={`text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? "↑" : "↓"} {formattedChange}% from yesterday
          </span>
          <SparklineChart data={chartData} isPositive={isPositive} />
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to format price based on its magnitude
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  } else if (price >= 1) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  } else if (price >= 0.01) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  } else if (price >= 0.0001) {
    return price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })
  } else {
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 10 })
  }
}
