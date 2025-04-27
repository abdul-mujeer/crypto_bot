"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
  high24h?: number
  low24h?: number
  volume24h?: number
  timestamp?: string
}

export function MarketOverview() {
  const [prices, setPrices] = useState<CryptoPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [collectedCoins, setCollectedCoins] = useState<string[]>([])

  // First, fetch the list of collected coins
  useEffect(() => {
    async function fetchCollectedCoins() {
      try {
        const response = await fetch("http://localhost:5000/api/collected-coins")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          console.log("Collected coins from API:", data)
          setCollectedCoins(data)
        } else {
          console.warn("No collected coins returned from API, using defaults")
          // Default coins if none collected
          setCollectedCoins([
            "BTC/USDT",
            "ETH/USDT",
            "SOL/USDT",
            "XRP/USDT",
            "ADA/USDT",
            "DOGE/USDT",
            "SHIB/USDT",
            "PEPE/USDT",
            "MATIC/USDT",
          ])
        }
      } catch (error) {
        console.error("Error fetching collected coins:", error)
        // Default coins on error
        setCollectedCoins([
          "BTC/USDT",
          "ETH/USDT",
          "SOL/USDT",
          "XRP/USDT",
          "ADA/USDT",
          "DOGE/USDT",
          "SHIB/USDT",
          "PEPE/USDT",
          "MATIC/USDT",
        ])
      }
    }

    fetchCollectedCoins()

    // Listen for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected, refreshing coins list")
      fetchCollectedCoins()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
    }
  }, [])

  // Then fetch prices for those coins
  useEffect(() => {
    if (collectedCoins.length === 0) return

    async function fetchPrices() {
      try {
        // Join the collected coins into a comma-separated string
        const symbolsParam = collectedCoins.join(",")
        console.log("Fetching market overview for symbols:", symbolsParam)

        // Fetch from our market-overview API with the collected coins
        const response = await fetch(`http://localhost:5000/api/market-overview?symbols=${symbolsParam}`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Market overview data received:", data)

        if (Array.isArray(data) && data.length > 0) {
          setPrices(data)
        } else {
          console.warn("Empty or invalid market overview data received")
          // Fallback to static data if API returns empty data
          setPrices([
            { symbol: "BTC/USDT", price: 68245.32, change24h: 2.5 },
            { symbol: "ETH/USDT", price: 3421.15, change24h: 1.8 },
            { symbol: "SOL/USDT", price: 142.87, change24h: -0.7 },
            { symbol: "XRP/USDT", price: 0.5423, change24h: -1.2 },
            { symbol: "ADA/USDT", price: 0.6791, change24h: -3.7 },
            { symbol: "DOGE/USDT", price: 0.1724, change24h: 5.3 },
            { symbol: "SHIB/USDT", price: 0.00002341, change24h: -1.2 },
            { symbol: "PEPE/USDT", price: 0.00000098, change24h: 4.5 },
            { symbol: "MATIC/USDT", price: 0.5723, change24h: 0.8 },
          ])
        }
      } catch (error) {
        console.error("Error fetching market overview:", error)
        // Fallback to static data if API fails
        setPrices([
          { symbol: "BTC/USDT", price: 68245.32, change24h: 2.5 },
          { symbol: "ETH/USDT", price: 3421.15, change24h: 1.8 },
          { symbol: "SOL/USDT", price: 142.87, change24h: -0.7 },
          { symbol: "XRP/USDT", price: 0.5423, change24h: -1.2 },
          { symbol: "ADA/USDT", price: 0.6791, change24h: -3.7 },
          { symbol: "DOGE/USDT", price: 0.1724, change24h: 5.3 },
          { symbol: "SHIB/USDT", price: 0.00002341, change24h: -1.2 },
          { symbol: "PEPE/USDT", price: 0.00000098, change24h: 4.5 },
          { symbol: "MATIC/USDT", price: 0.5723, change24h: 0.8 },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [collectedCoins])

  if (loading) {
    return (
      <>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-12 bg-muted rounded"></div>
              <div className="h-4 w-4 bg-muted rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted rounded mb-2"></div>
              <div className="h-4 w-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </>
    )
  }

  return (
    <>
      {prices.map((crypto) => (
        <Card key={crypto.symbol}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{crypto.symbol.split("/")[0]}</CardTitle>
            {crypto.change24h >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {crypto.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: crypto.price < 1 ? (crypto.price < 0.01 ? 8 : 4) : 2,
              })}
            </div>
            <p className={`text-xs flex items-center ${crypto.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
              {crypto.change24h >= 0 ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
              {Math.abs(crypto.change24h).toFixed(2)}% from yesterday
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  )
}
