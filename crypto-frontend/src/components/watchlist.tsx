"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WatchlistSparkline } from "./watchlist-sparkline"
import { Button } from "@/components/ui/button"
import { Minus, Loader2, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

// Use the same keys as in sidebar.tsx
const WATCHLIST_STORAGE_KEY = "crypto-trader-watchlist"
const WATCHLIST_UPDATE_KEY = "crypto-trader-watchlist-updated"

interface CryptoData {
  symbol: string
  price: number
  change24h: number
  sparklineData?: number[]
}

export function Watchlist() {
  const [cryptos, setCryptos] = useState<CryptoData[]>([])
  const [loading, setLoading] = useState(true)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Keep track of recently removed symbols to prevent them from reappearing
  const removedSymbols = useRef<Set<string>>(new Set())

  // Flag to prevent automatic refresh after removal
  const preventRefresh = useRef<boolean>(false)

  // Last update timestamp
  const lastUpdateRef = useRef<number>(0)

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

  // Create a fetchData function that can be called from multiple places
  const fetchData = useCallback(async (force = false) => {
    // Skip refresh if we just removed a coin and it's not a forced refresh
    if (preventRefresh.current && !force) {
      console.log("Skipping refresh after removal")
      return
    }

    try {
      setLoading(true)
      console.log("Fetching watchlist data...")

      // Check localStorage first
      const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY)
      let currentSymbols: string[] = []

      if (storedWatchlist) {
        currentSymbols = JSON.parse(storedWatchlist)
        console.log("Found watchlist in localStorage:", currentSymbols)
      } else {
        // If not in localStorage, fetch from API
        const symbolsResponse = await fetch("http://localhost:5000/api/watchlist/symbols")
        if (!symbolsResponse.ok) {
          throw new Error(`HTTP error! Status: ${symbolsResponse.status}`)
        }
        currentSymbols = await symbolsResponse.json()
        console.log("Fetched watchlist symbols from API:", currentSymbols)

        // Store in localStorage for future use
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(currentSymbols))
      }

      // Filter out any recently removed symbols, but keep all others
      const filteredSymbols = currentSymbols.filter((symbol: string) => !removedSymbols.current.has(symbol))
      console.log("Filtered symbols (removing recently removed):", filteredSymbols)

      // Update the watchlist symbols state
      setWatchlistSymbols(filteredSymbols)

      // If we have watchlist symbols, use them to fetch market data
      if (filteredSymbols.length > 0) {
        const symbolsParam = filteredSymbols.join(",")
        const response = await fetch(`http://localhost:5000/api/market-overview?symbols=${symbolsParam}`)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Fetched market data for watchlist:", data)

        if (Array.isArray(data) && data.length > 0) {
          // Transform the data and add sparkline data
          const processedData = data.map((crypto) => ({
            symbol: crypto.symbol.split("/")[0],
            price: crypto.price,
            change24h: crypto.change24h,
            sparklineData: generateSparklineData(crypto.change24h),
          }))

          // Final filter to ensure no removed coins appear
          const finalData = processedData.filter((crypto) => !removedSymbols.current.has(`${crypto.symbol}/USDT`))

          console.log("Final processed watchlist data:", finalData)
          setCryptos(finalData)
        } else {
          // If no watchlist data, show empty state
          setCryptos([])
        }
      } else {
        // If no watchlist symbols, show empty state
        setCryptos([])
      }
    } catch (error) {
      console.error("Error fetching watchlist data:", error)
      setCryptos([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Check localStorage for updates
  useEffect(() => {
    const checkForUpdates = () => {
      const updateTimestamp = localStorage.getItem(WATCHLIST_UPDATE_KEY)
      if (updateTimestamp) {
        const timestamp = Number.parseInt(updateTimestamp)
        if (timestamp > lastUpdateRef.current) {
          console.log("Detected watchlist update in localStorage, refreshing...")
          lastUpdateRef.current = timestamp
          fetchData(true)
        }
      }
    }

    // Check immediately on mount
    checkForUpdates()

    // Set up interval to check for updates
    const interval = setInterval(checkForUpdates, 1000)

    return () => clearInterval(interval)
  }, [fetchData])

  // Fetch watchlist data on component mount
  useEffect(() => {
    // Initial data fetch
    fetchData(true)

    // Listen for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in watchlist")
      // Add a small delay to ensure the backend has processed the new data
      setTimeout(() => fetchData(true), 1000)
    }

    // Listen for watchlist update events from sidebar
    const handleWatchlistUpdated = (event: CustomEvent) => {
      console.log("Watchlist update event detected:", event.detail)

      // Force refresh for both add and remove actions
      if (event.detail?.action === "add") {
        console.log("Add action detected, forcing refresh")
        // Add a small delay to ensure the backend has processed the changes
        setTimeout(() => fetchData(true), 500)
      }
    }

    window.addEventListener("dataCollected", handleDataCollected)
    window.addEventListener("watchlistUpdated", handleWatchlistUpdated as EventListener)

    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
      window.removeEventListener("watchlistUpdated", handleWatchlistUpdated as EventListener)
    }
  }, [fetchData])

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

  // Check if a symbol is in the watchlist
  function isInWatchlist(symbol: string): boolean {
    return watchlistSymbols.includes(`${symbol}/USDT`)
  }

  // Remove from watchlist
  async function removeFromWatchlist(symbol: string) {
    try {
      console.log(`Removing ${symbol} from watchlist...`)
      setActionLoading(symbol)

      // Set the flag to prevent automatic refresh
      preventRefresh.current = true

      // Add to removed symbols set
      removedSymbols.current.add(`${symbol}/USDT`)

      // Immediately update UI by removing the coin
      setCryptos((prevCryptos) => prevCryptos.filter((crypto) => crypto.symbol !== symbol))

      // Update watchlist symbols state
      setWatchlistSymbols((prev) => prev.filter((s) => s !== `${symbol}/USDT`))

      // Update localStorage
      const currentWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || "[]")
      const updatedWatchlist = currentWatchlist.filter((s: string) => s !== `${symbol}/USDT`)
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist))
      localStorage.setItem(WATCHLIST_UPDATE_KEY, Date.now().toString())

      const response = await fetch("http://localhost:5000/api/watchlist/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: `${symbol}/USDT`,
        }),
      })

      const data = await response.json()
      console.log(`API response for removing ${symbol}:`, data)

      if (data.success) {
        toast({
          title: "Removed from watchlist",
          description: `${symbol} has been removed from your watchlist`,
        })

        // Dispatch an event to notify other components
        const event = new CustomEvent("watchlistUpdated", {
          detail: { symbol: `${symbol}/USDT`, action: "remove" },
        })
        window.dispatchEvent(event)

        console.log(`Successfully removed ${symbol} from watchlist`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to remove from watchlist",
          variant: "destructive",
        })

        // If there was an error, we should remove from our local tracking
        removedSymbols.current.delete(`${symbol}/USDT`)

        // And force a refresh to get back to a consistent state
        setTimeout(() => fetchData(true), 500)
      }
    } catch (error) {
      console.error(`Error removing ${symbol} from watchlist:`, error)
      toast({
        title: "Error",
        description: "Failed to remove from watchlist",
        variant: "destructive",
      })

      // If there was an error, we should remove from our local tracking
      removedSymbols.current.delete(`${symbol}/USDT`)

      // And force a refresh to get back to a consistent state
      setTimeout(() => fetchData(true), 500)
    } finally {
      setActionLoading(null)

      // Reset the prevent refresh flag after a delay
      setTimeout(() => {
        preventRefresh.current = false
      }, 5000)
    }
  }

  // Manual refresh function
  function refreshWatchlist() {
    console.log("Manual refresh triggered")
    setRefreshing(true)
    fetchData(true)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Watchlist</CardTitle>
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw className="h-4 w-4" />
          </Button>
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

  if (cryptos.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Watchlist</CardTitle>
          <Button variant="ghost" size="sm" onClick={refreshWatchlist} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardHeader>
        <CardContent className="text-center py-6">
          <div className="text-muted-foreground mb-2">Your watchlist is empty</div>
          <div className="text-sm mb-4">Add cryptocurrencies from the sidebar to track them here</div>
          <Button variant="outline" size="sm" onClick={refreshWatchlist} className="mx-auto" disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh Watchlist"}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Watchlist</CardTitle>
        <Button variant="ghost" size="sm" onClick={refreshWatchlist} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
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

                <div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFromWatchlist(crypto.symbol)}
                    disabled={actionLoading === crypto.symbol}
                  >
                    {actionLoading === crypto.symbol ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
