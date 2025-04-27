"use client"

import { useEffect, useState } from "react"

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

export function RecentSignals() {
  const [signals, setSignals] = useState<TradingSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSignals() {
      try {
        // Fetch data from the API
        const response = await fetch("http://localhost:5000/api/trading-signals")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        // Use the actual API response data
        setSignals(data)

        // Log the data for debugging
        console.log("Trading signals from API:", data)
      } catch (error) {
        console.error("Error fetching signals:", error)
        // Optionally, you could fall back to mock data if the API fails
        setSignals([])
      } finally {
        setLoading(false)
      }
    }

    fetchSignals()

    // Add event listener for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in signals, refreshing data")
      setLoading(true)
      fetchSignals()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    // Clean up event listener
    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
    }
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading signals...</div>
  }

  if (signals.length === 0) {
    return <div className="text-center py-4">No signals available</div>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 font-medium">
            <th className="py-3 px-4 text-left">Symbol</th>
            <th className="py-3 px-4 text-left">Timestamp</th>
            <th className="py-3 px-4 text-left">Signal</th>
            <th className="py-3 px-4 text-left">Price</th>
            <th className="py-3 px-4 text-left">Technical</th>
            <th className="py-3 px-4 text-left">Sentiment</th>
            <th className="py-3 px-4 text-left">Confidence</th>
            <th className="py-3 px-4 text-left">Indicators</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal) => (
            <tr key={signal.id} className="border-b">
              <td className="py-3 px-4">{signal.symbol}</td>
              <td className="py-3 px-4">{new Date(signal.timestamp).toLocaleString()}</td>
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
                {signal.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ||
                  "N/A"}
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
  )
}
