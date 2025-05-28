"use client"

import { useEffect, useState } from "react"
import { CryptoCard } from "./crypto-card"

interface CryptoPrice {
  symbol: string
  price: number
  change24h: number
  high24h?: number
  low24h?: number
  volume24h?: number
  timestamp?: string
  sparklineData?: number[]
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
            "LINK/USDT",
            "UNI/USDT",
            "AAVE/USDT",
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
          "LINK/USDT",
          "UNI/USDT",
          "AAVE/USDT",
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
          // Generate random sparkline data for each coin
          const dataWithSparklines = data.map((coin) => ({
            ...coin,
            sparklineData: generateRandomSparkline(coin.change24h),
          }))
          setPrices(dataWithSparklines)
        } else {
          console.warn("Empty or invalid market overview data received")
          // Fallback to static data if API returns empty data
          setPrices([
            { symbol: "BTC/USDT", price: 68245.32, change24h: 2.5, sparklineData: generateRandomSparkline(2.5) },
            { symbol: "ETH/USDT", price: 3421.15, change24h: 1.8, sparklineData: generateRandomSparkline(1.8) },
            { symbol: "SOL/USDT", price: 142.87, change24h: -0.7, sparklineData: generateRandomSparkline(-0.7) },
            { symbol: "XRP/USDT", price: 0.5423, change24h: -1.2, sparklineData: generateRandomSparkline(-1.2) },
            { symbol: "ADA/USDT", price: 0.6791, change24h: -3.7, sparklineData: generateRandomSparkline(-3.7) },
            { symbol: "DOGE/USDT", price: 0.1724, change24h: 5.3, sparklineData: generateRandomSparkline(5.3) },
            { symbol: "SHIB/USDT", price: 0.00002341, change24h: -1.2, sparklineData: generateRandomSparkline(-1.2) },
            { symbol: "PEPE/USDT", price: 0.00000098, change24h: 4.5, sparklineData: generateRandomSparkline(4.5) },
            { symbol: "MATIC/USDT", price: 0.5723, change24h: 0.8, sparklineData: generateRandomSparkline(0.8) },
            { symbol: "LINK/USDT", price: 14.59, change24h: -1.35, sparklineData: generateRandomSparkline(-1.35) },
            { symbol: "UNI/USDT", price: 7.82, change24h: -0.9, sparklineData: generateRandomSparkline(-0.9) },
            { symbol: "AAVE/USDT", price: 168.28, change24h: -0.5, sparklineData: generateRandomSparkline(-0.5) },
          ])
        }
      } catch (error) {
        console.error("Error fetching market overview:", error)
        // Fallback to static data if API fails
        setPrices([
          { symbol: "BTC/USDT", price: 68245.32, change24h: 2.5, sparklineData: generateRandomSparkline(2.5) },
          { symbol: "ETH/USDT", price: 3421.15, change24h: 1.8, sparklineData: generateRandomSparkline(1.8) },
          { symbol: "SOL/USDT", price: 142.87, change24h: -0.7, sparklineData: generateRandomSparkline(-0.7) },
          { symbol: "XRP/USDT", price: 0.5423, change24h: -1.2, sparklineData: generateRandomSparkline(-1.2) },
          { symbol: "ADA/USDT", price: 0.6791, change24h: -3.7, sparklineData: generateRandomSparkline(-3.7) },
          { symbol: "DOGE/USDT", price: 0.1724, change24h: 5.3, sparklineData: generateRandomSparkline(5.3) },
          { symbol: "SHIB/USDT", price: 0.00002341, change24h: -1.2, sparklineData: generateRandomSparkline(-1.2) },
          { symbol: "PEPE/USDT", price: 0.00000098, change24h: 4.5, sparklineData: generateRandomSparkline(4.5) },
          { symbol: "MATIC/USDT", price: 0.5723, change24h: 0.8, sparklineData: generateRandomSparkline(0.8) },
          { symbol: "LINK/USDT", price: 14.59, change24h: -1.35, sparklineData: generateRandomSparkline(-1.35) },
          { symbol: "UNI/USDT", price: 7.82, change24h: -0.9, sparklineData: generateRandomSparkline(-0.9) },
          { symbol: "AAVE/USDT", price: 168.28, change24h: -0.5, sparklineData: generateRandomSparkline(-0.5) },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
          <div key={i} className="animate-pulse bg-muted rounded-lg h-32"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {prices.map((crypto) => (
        <CryptoCard
          key={crypto.symbol}
          symbol={crypto.symbol.split("/")[0]}
          price={crypto.price}
          change={crypto.change24h}
          sparklineData={crypto.sparklineData}
        />
      ))}
    </div>
  )
}

// Helper function to generate random sparkline data based on the trend
function generateRandomSparkline(change: number): number[] {
  const length = 20
  const trend = change >= 0 ? 1 : -1
  const volatility = Math.abs(change) / 2

  let value = 100
  const data = [value]

  for (let i = 1; i < length; i++) {
    // Random walk with trend bias
    const randomChange = (Math.random() - 0.5) * volatility
    const trendChange = Math.random() * volatility * 0.5 * trend
    value += randomChange + trendChange
    data.push(value)
  }

  return data
}
