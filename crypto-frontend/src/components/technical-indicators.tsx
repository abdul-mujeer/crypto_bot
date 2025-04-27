"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"

interface TechnicalFeature {
  timestamp: string
  symbol: string
  timeframe: string
  [key: string]: any // For all the technical indicators
}

interface TechnicalIndicator {
  name: string
  value: number
  signal: "bullish" | "bearish" | "neutral"
  description: string
}

interface TechnicalIndicatorsProps {
  symbol: string
  timeframe: string
}

// Map of indicator names to their descriptions
const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  rsi_14: "Relative Strength Index (14 periods)",
  macd: "Moving Average Convergence Divergence",
  macd_signal: "MACD Signal Line",
  macd_hist: "MACD Histogram",
  sma_20: "Simple Moving Average (20 periods)",
  sma_50: "Simple Moving Average (50 periods)",
  sma_200: "Simple Moving Average (200 periods)",
  ema_12: "Exponential Moving Average (12 periods)",
  ema_26: "Exponential Moving Average (26 periods)",
  bb_upper: "Bollinger Band Upper",
  bb_middle: "Bollinger Band Middle",
  bb_lower: "Bollinger Band Lower",
  bb_width: "Bollinger Band Width",
  stoch_k: "Stochastic Oscillator %K",
  stoch_d: "Stochastic Oscillator %D",
  adx: "Average Directional Index",
  atr: "Average True Range",
  obv: "On-Balance Volume",
  // Add more indicators as needed
}

// Function to determine signal from indicator value
function determineSignal(name: string, value: number, price: number): "bullish" | "bearish" | "neutral" {
  if (name.includes("rsi")) {
    if (value > 70) return "bearish"
    if (value < 30) return "bullish"
    return "neutral"
  }

  if (name.includes("macd_hist")) {
    if (value > 0) return "bullish"
    if (value < 0) return "bearish"
    return "neutral"
  }

  if (name.includes("sma") || name.includes("ema")) {
    if (price > value) return "bullish"
    if (price < value) return "bearish"
    return "neutral"
  }

  if (name.includes("stoch")) {
    if (value > 80) return "bearish"
    if (value < 20) return "bullish"
    return "neutral"
  }

  // Default
  return "neutral"
}

export function TechnicalIndicators({ symbol, timeframe }: TechnicalIndicatorsProps) {
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchIndicators() {
      setLoading(true)
      try {
        // Fetch data from the API
        const response = await fetch(
          `http://localhost:5000/api/technical-features?symbol=${symbol}&timeframe=${timeframe}`,
        )
        const data = await response.json()

        // Log the data for debugging
        console.log("Technical features from API:", data)

        if (data.length === 0) {
          setIndicators([])
          return
        }

        // Get the most recent data point
        const latestData = data[0]
        const price = latestData.close || 0

        // Transform the API data into our indicator format
        const transformedIndicators: TechnicalIndicator[] = []

        for (const [key, value] of Object.entries(latestData)) {
          // Skip non-indicator fields
          if (["timestamp", "symbol", "timeframe", "open", "high", "low", "close", "volume"].includes(key)) {
            continue
          }

          if (typeof value === "number" && !isNaN(value)) {
            transformedIndicators.push({
              name: key,
              value: value,
              signal: determineSignal(key, value, price),
              description: INDICATOR_DESCRIPTIONS[key] || key,
            })
          }
        }

        setIndicators(transformedIndicators)
      } catch (error) {
        console.error("Error fetching technical indicators:", error)
        setIndicators([])
      } finally {
        setLoading(false)
      }
    }

    fetchIndicators()
  }, [symbol, timeframe])

  if (loading) {
    return <div className="text-center py-4">Loading indicators...</div>
  }

  if (indicators.length === 0) {
    return <div className="text-center py-4">No technical indicators available for {symbol}</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {indicators.map((indicator) => (
        <Card key={indicator.name} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{indicator.name}</h3>
                <p className="text-xs text-muted-foreground">{indicator.description}</p>
              </div>
              <div
                className={`flex items-center ${
                  indicator.signal === "bullish"
                    ? "text-green-500"
                    : indicator.signal === "bearish"
                      ? "text-red-500"
                      : "text-yellow-500"
                }`}
              >
                {indicator.signal === "bullish" ? (
                  <ArrowUp className="h-4 w-4 mr-1" />
                ) : indicator.signal === "bearish" ? (
                  <ArrowDown className="h-4 w-4 mr-1" />
                ) : (
                  <Minus className="h-4 w-4 mr-1" />
                )}
                {indicator.signal.charAt(0).toUpperCase() + indicator.signal.slice(1)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">
                {typeof indicator.value === "number" && indicator.value > 1000
                  ? indicator.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : indicator.value.toFixed(2)}
              </span>
              <Progress
                value={
                  indicator.name.includes("rsi") || indicator.name.includes("stoch")
                    ? indicator.value
                    : // RSI and Stochastic are already 0-100
                      indicator.name.includes("bb_width")
                      ? indicator.value * 100
                      : // Normalize 0-1 to 0-100
                        50 + (indicator.signal === "bullish" ? 30 : indicator.signal === "bearish" ? -30 : 0) // Default for other indicators
                }
                className="h-2 w-24"
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
