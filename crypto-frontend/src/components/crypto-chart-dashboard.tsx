"use client"

import { useState, useEffect } from "react"
import { TradingViewChart } from "@/components/trading-view-chart"
import { TechnicalIndicators } from "@/components/technical-indicators"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

const TIMEFRAMES = [
  { value: "1", label: "1 Minute" },
  { value: "5", label: "5 Minutes" },
  { value: "15", label: "15 Minutes" },
  { value: "30", label: "30 Minutes" },
  { value: "60", label: "1 Hour" },
  { value: "240", label: "4 Hours" },
  { value: "D", label: "1 Day" },
  { value: "W", label: "1 Week" },
]

// Initial symbols list - will be updated from API
const INITIAL_SYMBOLS = [
  { value: "BTCUSDT", label: "BTC/USDT" },
  { value: "ETHUSDT", label: "ETH/USDT" },
  { value: "SOLUSDT", label: "SOL/USDT" },
  { value: "XRPUSDT", label: "XRP/USDT" },
  { value: "ADAUSDT", label: "ADA/USDT" },
  { value: "DOGEUSDT", label: "DOGE/USDT" },
  { value: "PEPEUSDT", label: "PEPE/USDT" },
]

interface TradingSignal {
  id: string
  symbol: string
  timestamp: string
  signal: string
  price: number
  technical_score: number
  sentiment_score: number
  confidence: number
  indicators: string
}

export function CryptoChartDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT")
  const [selectedTimeframe, setSelectedTimeframe] = useState("D")
  const [symbols, setSymbols] = useState(INITIAL_SYMBOLS)
  const [tradingSignal, setTradingSignal] = useState<TradingSignal | null>(null)
  const [loadingSignal, setLoadingSignal] = useState(true)

  // Fetch available symbols
  useEffect(() => {
    async function fetchSymbols() {
      try {
        // Use the collected-coins endpoint instead of symbols
        const response = await fetch("http://localhost:5000/api/collected-coins")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Collected coins for chart:", data)

        if (Array.isArray(data) && data.length > 0) {
          // Transform the data to match our format
          const formattedSymbols = data.map((symbol) => {
            // Handle both formats: "BTC/USDT" or {value: "BTC/USDT", label: "Bitcoin (BTC/USDT)"}
            const symbolStr = typeof symbol === "string" ? symbol : symbol.value
            const label = typeof symbol === "string" ? symbol : symbol.label

            // Convert "BTC/USDT" to "BTCUSDT" for TradingView
            const value = symbolStr.replace("/", "")
            return { value, label: symbolStr }
          })

          setSymbols(formattedSymbols)

          // If no symbol is selected yet, select the first one
          if (!selectedSymbol && formattedSymbols.length > 0) {
            setSelectedSymbol(formattedSymbols[0].value)
          }
        }
      } catch (error) {
        console.error("Error fetching symbols:", error)
      }
    }

    fetchSymbols()

    // Listen for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in chart, refreshing symbols")
      fetchSymbols()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
    }
  }, [])

  // Fetch trading signal for the selected symbol
  useEffect(() => {
    async function fetchTradingSignal() {
      setLoadingSignal(true)
      try {
        // Convert "BTCUSDT" to "BTC/USDT" for API
        const apiSymbol = selectedSymbol.replace("USDT", "/USDT")

        const response = await fetch("http://localhost:5000/api/trading-signals")
        const data = await response.json()

        // Find the signal for the selected symbol
        const signal = data.find((s: TradingSignal) => s.symbol === apiSymbol)

        if (signal) {
          setTradingSignal(signal)
        } else {
          setTradingSignal(null)
        }
      } catch (error) {
        console.error("Error fetching trading signal:", error)
        setTradingSignal(null)
      } finally {
        setLoadingSignal(false)
      }
    }

    fetchTradingSignal()
  }, [selectedSymbol])

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Market Chart</CardTitle>
            <CardDescription>Advanced TradingView chart with technical indicators</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((timeframe) => (
                  <SelectItem key={timeframe.value} value={timeframe.value}>
                    {timeframe.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] w-full">
            <TradingViewChart symbol={selectedSymbol} interval={selectedTimeframe} theme="light" autosize={true} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Technical Analysis</CardTitle>
            <CardDescription>
              Key technical indicators for {symbols.find((s) => s.value === selectedSymbol)?.label || selectedSymbol}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TechnicalIndicators
              symbol={selectedSymbol.replace("USDT", "/USDT")}
              timeframe={selectedTimeframe === "D" ? "1d" : selectedTimeframe === "W" ? "1w" : `${selectedTimeframe}m`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trading Recommendation</CardTitle>
            <CardDescription>AI-powered trading recommendation</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSignal ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tradingSignal ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Signal</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tradingSignal.signal === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {tradingSignal.signal}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confidence</span>
                  <span className="text-sm">{(tradingSignal.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Technical Score</span>
                  <span className="text-sm">{tradingSignal.technical_score.toFixed(1)}/4.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sentiment Score</span>
                  <span className="text-sm">{tradingSignal.sentiment_score.toFixed(2)}/1.0</span>
                </div>
                <div className="pt-2">
                  <h4 className="text-sm font-medium mb-2">Contributing Indicators</h4>
                  <div className="flex flex-wrap gap-1">
                    {tradingSignal.indicators ? (
                      tradingSignal.indicators.split(", ").map((indicator, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {indicator}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">No indicator data available</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No trading signals available for {selectedSymbol.replace("USDT", "/USDT")}</p>
                <p className="text-sm mt-2">Try collecting data for this symbol first</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
