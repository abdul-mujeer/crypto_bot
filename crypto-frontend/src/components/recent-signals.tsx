"use client"

import { useEffect, useState } from "react"
import { RefreshCcw, Clock, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { WatchlistSparkline } from "./watchlist-sparkline"

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
  take_profit?: number
  stop_loss?: number
  pattern?: string
  trade_status?: string
  expiry_time?: string
}

export function RecentSignals() {
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchSignals = async () => {
    try {
      setLoading(true)
      // Fetch data from the API
      const response = await fetch("http://localhost:5000/api/trading-signals")
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()

      // Process the data to ensure all fields are properly formatted
      const processedData = data.map((signal) => ({
        ...signal,
        take_profit: typeof signal.take_profit === "number" ? signal.take_profit : null,
        stop_loss: typeof signal.stop_loss === "number" ? signal.stop_loss : null,
        pattern: signal.pattern || null,
        trade_status: signal.trade_status || "Active",
      }))

      // Use the processed API response data
      setSignals(processedData)
      setCurrentTime(new Date()) // Update current time when signals are fetched

      // Log the data for debugging
      console.log("Trading signals from API:", processedData)
    } catch (error) {
      console.error("Error fetching signals:", error)
      // Optionally, you could fall back to mock data if the API fails
      setSignals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignals()

    // Add event listener for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in signals, refreshing data")
      fetchSignals()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    // Set up timer to update elapsed time display
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second for more accurate time display

    // Clean up event listener and timer
    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
      clearInterval(timer)
    }
  }, [])

  // Function to determine trade status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800"
      case "expired":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-blue-100 text-blue-800"
    }
  }

  // Function to format the exact time from timestamp
  const formatExactTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  }

  // Function to format elapsed time since signal generation
  const formatElapsedTime = (timestamp: string) => {
    const signalTime = new Date(timestamp).getTime()
    const elapsedMs = currentTime.getTime() - signalTime

    // Handle case where server time might be ahead of client time
    if (elapsedMs < 0) {
      return "just now"
    }

    // Convert to hours, minutes, seconds
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60))
    const minutes = Math.floor((elapsedMs % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((elapsedMs % (1000 * 60)) / 1000)

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s ago`
    } else {
      return `${seconds}s ago`
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Trading Signals</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refreshing...
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading signals...</p>
        </div>
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Recent Trading Signals</h2>
          <Button variant="outline" size="sm" onClick={fetchSignals}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        <div className="text-center py-8 border rounded-md">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
          <p className="mb-4">No signals available</p>
          <Button onClick={fetchSignals}>Check for Signals</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Recent Trading Signals</h2>
        <Button variant="outline" size="sm" onClick={fetchSignals}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 font-medium">
              <th className="py-3 px-4 text-left">Symbol</th>
              <th className="py-3 px-4 text-left">Date & Time</th>
              <th className="py-3 px-4 text-left">Signal</th>
              <th className="py-3 px-4 text-left">Price</th>
              <th className="py-3 px-4 text-left">TP/SL</th>
              <th className="py-3 px-4 text-left">Chart</th>
              <th className="py-3 px-4 text-left">Status</th>
              <th className="py-3 px-4 text-left">Technical</th>
              <th className="py-3 px-4 text-left">Sentiment</th>
              <th className="py-3 px-4 text-left">Confidence</th>
              <th className="py-3 px-4 text-left">Indicators</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((signal) => (
              <tr key={signal.id} className="border-b">
                <td className="py-3 px-4 font-medium">{signal.symbol}</td>
                <td className="py-3 px-4">
                  <div>{new Date(signal.timestamp).toLocaleDateString()}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatExactTime(signal.timestamp)}
                    </div>
                    <div className="text-xs ml-2 bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">
                      {formatElapsedTime(signal.timestamp)}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      signal.signal === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {signal.signal}
                  </span>
                </td>
                <td className="py-3 px-4">
                  $
                  {signal.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) ||
                    "N/A"}
                </td>
                <td className="py-3 px-4">
                  {signal.take_profit && signal.stop_loss ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="space-y-1 cursor-pointer">
                            <div className="flex items-center text-xs">
                              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                              <span className="text-green-600">
                                $
                                {typeof signal.take_profit === "number"
                                  ? signal.take_profit.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 8,
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                            <div className="flex items-center text-xs">
                              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                              <span className="text-red-600">
                                $
                                {typeof signal.stop_loss === "number"
                                  ? signal.stop_loss.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 8,
                                    })
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Take Profit: ${signal.take_profit}</p>
                          <p>Stop Loss: ${signal.stop_loss}</p>
                          {signal.signal === "BUY" &&
                          typeof signal.take_profit === "number" &&
                          typeof signal.price === "number" &&
                          typeof signal.stop_loss === "number" ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Risk/Reward:{" "}
                              {((signal.take_profit - signal.price) / (signal.price - signal.stop_loss)).toFixed(2)}
                            </p>
                          ) : signal.signal === "SELL" &&
                            typeof signal.take_profit === "number" &&
                            typeof signal.price === "number" &&
                            typeof signal.stop_loss === "number" ? (
                            <p className="text-xs text-muted-foreground mt-1">
                              Risk/Reward:{" "}
                              {((signal.price - signal.take_profit) / (signal.stop_loss - signal.price)).toFixed(2)}
                            </p>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="w-16 h-8">
                    <WatchlistSparkline symbol={signal.symbol} type={signal.signal === "BUY" ? "up" : "down"} />
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                      signal.trade_status || "Active",
                    )}`}
                  >
                    {signal.trade_status || "Active"}
                  </span>
                </td>
                <td className="py-3 px-4">{signal.technical_score?.toFixed(2) || "N/A"}</td>
                <td className="py-3 px-4">{signal.sentiment_score?.toFixed(2) || "N/A"}</td>
                <td className="py-3 px-4">{signal.confidence?.toFixed(2) || "N/A"}</td>
                <td className="py-3 px-4">
                  {signal.indicators ? (
                    <div className="flex flex-wrap gap-1">
                      {signal.indicators.split(", ").map((indicator, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
