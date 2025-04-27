"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WatchlistSparkline } from "./watchlist-sparkline"

interface CryptoData {
  symbol: string
  price: number
  change24h: number
  sparklineData?: number[]
}

export function Watchlist() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch from your API
        const response = await fetch("http://localhost:5000/api/market-overview")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          // Transform the data and add sparkline data
          const processedData = data.map((crypto) => ({
            symbol: crypto.symbol.split("/")[0],
            price: crypto.price,
            change24h: crypto.change24h,
            sparklineData: generateSparklineData(crypto.change24h),
          }))

          setCryptos(processedData)
        } else {
          // Fallback data
          setCryptos(getFallbackData())
        }
      } catch (error) {
        console.error("Error fetching watchlist data:", error)
        setCryptos(getFallbackData())
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Listen for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in watchlist, refreshing data")
      setLoading(true)
      fetchData()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
    }
  }, [])

  // Helper function to generate sparkline data based on trend
  function generateSparklineData(change: number): number[] {
    const length = 20
    const trend = change >= 0 ? 1 : -1
    const volatility = Math.abs(change) / 2

    let value = 100
    const data = [value]

    for (let i = 1; i < length; i++) {
      const randomChange = (Math.random() - 0.5) * volatility
      const trendChange = Math.random() * volatility * 0.5 * trend
      value += randomChange + trendChange
      data.push(value)
    }

    return data
  }

  // Fallback data if API fails
  function getFallbackData(): CryptoData[] {
    return [
      { symbol: "BTC", price: 97730.66, change24h: -0.87, sparklineData: generateSparklineData(-0.87) },
      { symbol: "ETH", price: 2647.28, change24h: -0.37, sparklineData: generateSparklineData(-0.37) },
      { symbol: "SOL", price: 149.94, change24h: 0.94, sparklineData: generateSparklineData(0.94) },
      { symbol: "XRP", price: 2.42, change24h: -1.33, sparklineData: generateSparklineData(-1.33) },
      { symbol: "ADA", price: 0.7022, change24h: -0.34, sparklineData: generateSparklineData(-0.34) },
      { symbol: "DOGE", price: 0.1806, change24h: -0.06, sparklineData: generateSparklineData(-0.06) },
      { symbol: "SHIB", price: 0.00001356, change24h: -3.81, sparklineData: generateSparklineData(-3.81) },
      { symbol: "MATIC", price: 0.2403, change24h: -2.71, sparklineData: generateSparklineData(-2.71) },
    ]
  }

  // Format price based on its magnitude
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex justify-between">
                <div className="h-5 bg-muted rounded w-20"></div>
                <div className="h-5 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlist</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {cryptos.map((crypto) => (
            <div key={crypto.symbol} className="flex items-center justify-between py-3 px-4 hover:bg-muted/50">
              <div className="flex flex-col">
                <span className="font-bold">{crypto.symbol}</span>
                <span className="text-xs text-muted-foreground">{crypto.symbol} USD</span>
              </div>

              <div className="flex items-center gap-3">
                <WatchlistSparkline
                  data={crypto.sparklineData || []}
                  color={crypto.change24h >= 0 ? "#22c55e" : "#ef4444"}
                />

                <div className="flex flex-col items-end">
                  <span className="font-medium">${formatPrice(crypto.price)}</span>
                  <span className={`text-xs ${crypto.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {crypto.change24h >= 0 ? "↑" : "↓"} {Math.abs(crypto.change24h).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
