"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  Database,
  Home,
  LineChart,
  Moon,
  Newspaper,
  Settings,
  ShoppingBag,
  Sun,
  Wallet,
  Loader2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

// Create a key for localStorage
const WATCHLIST_STORAGE_KEY = "crypto-trader-watchlist"
const WATCHLIST_UPDATE_KEY = "crypto-trader-watchlist-updated"

export function Sidebar() {
  const { theme, setTheme } = useTheme()
  const [cryptoExpanded, setCryptoExpanded] = useState(true)
  const [activeItem, setActiveItem] = useState("dashboard")
  const [collectedCoins, setCollectedCoins] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Keep track of recently added symbols
  const addedSymbols = useRef<Set<string>>(new Set())

  // Listen for watchlist update events from the watchlist component
  useEffect(() => {
    const handleWatchlistUpdated = (event: CustomEvent) => {
      console.log("Sidebar received watchlist update event:", event.detail)

      if (event.detail?.action === "remove") {
        // Update our local state to reflect the removal
        const symbolToRemove = event.detail.symbol
        setWatchlistSymbols((prev) => prev.filter((s) => s !== symbolToRemove))

        // Update localStorage
        const currentWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || "[]")
        const updatedWatchlist = currentWatchlist.filter((s: string) => s !== symbolToRemove)
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist))
      }
    }

    window.addEventListener("watchlistUpdated", handleWatchlistUpdated as EventListener)

    return () => {
      window.removeEventListener("watchlistUpdated", handleWatchlistUpdated as EventListener)
    }
  }, [])

  // Fetch watchlist symbols
  useEffect(() => {
    async function fetchWatchlistSymbols() {
      try {
        console.log("Sidebar fetching watchlist symbols...")
        const response = await fetch("http://localhost:5000/api/watchlist/symbols")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        console.log("Sidebar received watchlist symbols:", data)

        // Store in localStorage
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(data))

        // Filter out any recently added symbols that might not be in the response yet
        const combinedSymbols = [...new Set([...data, ...Array.from(addedSymbols.current)])]
        setWatchlistSymbols(combinedSymbols)
      } catch (error) {
        console.error("Error fetching watchlist symbols:", error)

        // Try to get from localStorage if API fails
        const storedWatchlist = localStorage.getItem(WATCHLIST_STORAGE_KEY)
        if (storedWatchlist) {
          setWatchlistSymbols(JSON.parse(storedWatchlist))
        } else {
          setWatchlistSymbols([])
        }
      }
    }

    fetchWatchlistSymbols()
  }, [])

  // Add this function to check if a coin is in the watchlist
  function isInWatchlist(symbol: string): boolean {
    return watchlistSymbols.includes(`${symbol}/USDT`) || addedSymbols.current.has(`${symbol}/USDT`)
  }

  // Add this function to add a coin to the watchlist
  async function addToWatchlist(symbol: string, e: React.MouseEvent) {
    // Prevent the link click event from firing
    e.stopPropagation()
    e.preventDefault()

    // If already in watchlist, don't do anything
    if (isInWatchlist(symbol)) {
      toast({
        title: "Already in watchlist",
        description: `${symbol} is already in your watchlist`,
      })
      return
    }

    try {
      console.log(`Adding ${symbol} to watchlist...`)
      setActionLoading(symbol)

      // Add to our tracking set
      addedSymbols.current.add(`${symbol}/USDT`)

      // Update local state immediately
      setWatchlistSymbols((prev) => [...prev, `${symbol}/USDT`])

      // Update localStorage
      const currentWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || "[]")
      const updatedWatchlist = [...currentWatchlist, `${symbol}/USDT`]
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist))

      // Set a timestamp to indicate the watchlist was updated
      localStorage.setItem(WATCHLIST_UPDATE_KEY, Date.now().toString())

      const response = await fetch("http://localhost:5000/api/watchlist/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol: `${symbol}/USDT`,
        }),
      })

      const data = await response.json()
      console.log(`API response for adding ${symbol}:`, data)

      if (data.success) {
        toast({
          title: "Added to watchlist",
          description: `${symbol} has been added to your watchlist`,
        })

        // Dispatch an event to notify other components
        console.log(`Dispatching watchlistUpdated event for ${symbol} with action 'add'`)
        const event = new CustomEvent("watchlistUpdated", {
          detail: { symbol: `${symbol}/USDT`, action: "add" },
        })
        window.dispatchEvent(event)

        // Force a refresh of the watchlist by updating localStorage again
        localStorage.setItem(WATCHLIST_UPDATE_KEY, Date.now().toString())

        console.log(`Successfully added ${symbol} to watchlist`)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to add to watchlist",
          variant: "destructive",
        })

        // Remove from our tracking set
        addedSymbols.current.delete(`${symbol}/USDT`)

        // Update local state to remove the symbol
        setWatchlistSymbols((prev) => prev.filter((s) => s !== `${symbol}/USDT`))

        // Update localStorage
        const currentWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || "[]")
        const updatedWatchlist = currentWatchlist.filter((s: string) => s !== `${symbol}/USDT`)
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist))
      }
    } catch (error) {
      console.error(`Error adding ${symbol} to watchlist:`, error)
      toast({
        title: "Error",
        description: "Failed to add to watchlist",
        variant: "destructive",
      })

      // Remove from our tracking set
      addedSymbols.current.delete(`${symbol}/USDT`)

      // Update local state to remove the symbol
      setWatchlistSymbols((prev) => prev.filter((s) => s !== `${symbol}/USDT`))

      // Update localStorage
      const currentWatchlist = JSON.parse(localStorage.getItem(WATCHLIST_STORAGE_KEY) || "[]")
      const updatedWatchlist = currentWatchlist.filter((s: string) => s !== `${symbol}/USDT`)
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(updatedWatchlist))
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => {
    async function fetchCollectedCoins() {
      try {
        setLoading(true)
        const response = await fetch("http://localhost:5000/api/collected-coins")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()

        if (Array.isArray(data) && data.length > 0) {
          // Transform the data to match our format
          const formattedCoins = data.map((symbol) => {
            // Handle format: "BTC/USDT"
            const baseCurrency = symbol.split("/")[0]
            return {
              id: baseCurrency.toLowerCase(),
              name: `${baseCurrency} (${baseCurrency})`,
            }
          })

          setCollectedCoins(formattedCoins)
        } else {
          // Fallback to default coins if no data
          setCollectedCoins([
            { id: "btc", name: "Bitcoin (BTC)" },
            { id: "eth", name: "Ethereum (ETH)" },
            { id: "sol", name: "Solana (SOL)" },
            { id: "xrp", name: "Ripple (XRP)" },
            { id: "ada", name: "Cardano (ADA)" },
          ])
        }
      } catch (error) {
        console.error("Error fetching collected coins:", error)
        // Fallback to default coins on error
        setCollectedCoins([
          { id: "btc", name: "Bitcoin (BTC)" },
          { id: "eth", name: "Ethereum (ETH)" },
          { id: "sol", name: "Solana (SOL)" },
          { id: "xrp", name: "Ripple (XRP)" },
          { id: "ada", name: "Cardano (ADA)" },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchCollectedCoins()

    // Listen for data collection events
    const handleDataCollected = () => {
      console.log("Data collection event detected in sidebar, refreshing coins")
      fetchCollectedCoins()
    }

    window.addEventListener("dataCollected", handleDataCollected)

    return () => {
      window.removeEventListener("dataCollected", handleDataCollected)
    }
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Logo */}
      <div className="p-4 flex items-center">
        <div className="bg-primary w-8 h-8 rounded flex items-center justify-center mr-2">
          <BarChart2 className="text-primary-foreground h-5 w-5" />
        </div>
        <div>
          <div className="font-bold">Crypto Trader</div>
          <div className="text-xs text-muted-foreground">v1.0.0</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Navigation</div>
        <nav className="space-y-1">
          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "dashboard"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("dashboard")}
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <div>
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                cryptoExpanded || activeItem.startsWith("crypto-")
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
              )}
              onClick={() => setCryptoExpanded(!cryptoExpanded)}
            >
              <div className="flex items-center gap-3">
                <LineChart className="h-4 w-4" />
                <span>Cryptocurrencies</span>
              </div>
              {cryptoExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            {cryptoExpanded && (
              <div className="mt-1 ml-6 space-y-1">
                {loading ? (
                  // Loading state
                  Array(3)
                    .fill(0)
                    .map((_, index) => <div key={index} className="animate-pulse h-8 bg-secondary/50 rounded-md" />)
                ) : collectedCoins.length > 0 ? (
                  // Show collected coins
                  collectedCoins.map((crypto) => (
                    <div key={crypto.id} className="flex items-center justify-between group">
                      <Link
                        href="#"
                        className={cn(
                          "flex-1 flex items-center rounded-md px-3 py-2 text-sm font-medium",
                          activeItem === `crypto-${crypto.id}`
                            ? "bg-secondary text-secondary-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        )}
                        onClick={() => setActiveItem(`crypto-${crypto.id}`)}
                      >
                        {crypto.name}
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 p-0 opacity-0 group-hover:opacity-100",
                          isInWatchlist(crypto.name.split(" ")[0]) && "opacity-50",
                        )}
                        disabled={actionLoading === crypto.id || isInWatchlist(crypto.name.split(" ")[0])}
                        onClick={(e) => addToWatchlist(crypto.name.split(" ")[0], e)}
                      >
                        {actionLoading === crypto.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))
                ) : (
                  // No coins collected yet
                  <div className="px-3 py-2 text-sm text-muted-foreground">No coins collected yet</div>
                )}
              </div>
            )}
          </div>

          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "trading-signals"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("trading-signals")}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Trading Signals</span>
          </Link>

          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "news"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("news")}
          >
            <Newspaper className="h-4 w-4" />
            <span>News & Sentiment</span>
          </Link>

          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "transactions"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("transactions")}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Transactions</span>
          </Link>

          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "portfolio"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("portfolio")}
          >
            <Wallet className="h-4 w-4" />
            <span>Portfolio</span>
          </Link>
        </nav>
      </div>

      {/* Analysis */}
      <div className="px-3 py-2 mt-4">
        <div className="text-xs font-medium text-muted-foreground mb-2 px-2">Analysis</div>
        <nav className="space-y-1">
          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "technical-analysis"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("technical-analysis")}
          >
            <LineChart className="h-4 w-4" />
            <span>Technical Analysis</span>
          </Link>

          <Link
            href="#"
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
              activeItem === "performance"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
            onClick={() => setActiveItem("performance")}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Performance</span>
          </Link>
        </nav>
      </div>

      {/* Collect Data Button */}
      <div className="px-3 py-2 mt-2">
        <Button
          className="w-full flex items-center gap-2"
          variant="default"
          onClick={() => {
            // Dispatch a custom event to open the data collection dialog
            const event = new CustomEvent("openDataCollectionDialog")
            window.dispatchEvent(event)
          }}
        >
          <Database className="h-4 w-4" />
          <span>Collect Data</span>
        </Button>
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Settings */}
      <div className="px-3 py-2">
        <Link
          href="#"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
            activeItem === "settings"
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
          )}
          onClick={() => setActiveItem("settings")}
        >
          <Settings className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      {/* Theme Toggle */}
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4 mr-2" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 mr-2" />
              <span>Dark Mode</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
