"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface WatchlistSparklineProps {
  symbol: string
  type?: "up" | "down" | "neutral"
}

export function WatchlistSparkline({ symbol, type = "neutral" }: WatchlistSparklineProps) {
  const [data, setData] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        // Fetch market data for the symbol
        const response = await fetch(`http://localhost:5000/api/market-data?symbol=${symbol}&timeframe=1h&limit=24`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const marketData = await response.json()

        if (marketData && marketData.length > 0) {
          // Extract close prices
          const prices = marketData.map((item: any) => item.close)
          setData(prices.reverse()) // Reverse to show oldest to newest
        } else {
          // Generate mock data if no data is available
          generateMockData()
        }
      } catch (error) {
        console.error(`Error fetching sparkline data for ${symbol}:`, error)
        // Generate mock data on error
        generateMockData()
      } finally {
        setLoading(false)
      }
    }

    const generateMockData = () => {
      // Generate random sparkline data based on the type
      const baseValue = 100
      const volatility = 5
      const points = 24

      const mockData: number[] = []
      let currentValue = baseValue

      for (let i = 0; i < points; i++) {
        // Add some randomness
        const change = (Math.random() - 0.5) * volatility

        // Bias the direction based on type
        let bias = 0
        if (type === "up") bias = 0.2
        if (type === "down") bias = -0.2

        currentValue = currentValue + change + bias
        mockData.push(currentValue)
      }

      setData(mockData)
    }

    fetchData()
  }, [symbol, type])

  if (loading) {
    return <Skeleton className="h-full w-full" />
  }

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground">No data</div>
  }

  // Calculate min and max for scaling
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min

  // Determine color based on trend
  let strokeColor = "#6B7280" // Default gray
  if (type === "up" || data[0] < data[data.length - 1]) {
    strokeColor = "#10B981" // Green for uptrend
  } else if (type === "down" || data[0] > data[data.length - 1]) {
    strokeColor = "#EF4444" // Red for downtrend
  }

  // Calculate points for the SVG path
  const width = 100
  const height = 40
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / (range || 1)) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="h-full w-full flex items-center justify-center">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
