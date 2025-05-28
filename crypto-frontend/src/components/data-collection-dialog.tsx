"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, Database, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CoinOption {
  value: string
  label: string
}

interface CollectionStatus {
  success: boolean
  message: string
}

interface DataCollectionDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DataCollectionDialog({ open, onOpenChange }: DataCollectionDialogProps) {
  // Remove this line:
  // const [open, setOpen] = useState(false)
  const [availableCoins, setAvailableCoins] = useState<CoinOption[]>([])
  const [selectedCoins, setSelectedCoins] = useState<string[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d")
  const [collectNews, setCollectNews] = useState(true)
  const [generateSignals, setGenerateSignals] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<CollectionStatus | null>(null)

  // Fetch available coins when dialog opens
  useEffect(() => {
    if (open) {
      fetchAvailableCoins()
    }
  }, [open])

  const fetchAvailableCoins = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/available-coins")
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Available coins:", data)

      if (Array.isArray(data)) {
        // Handle both formats: array of strings or array of objects
        const formattedCoins = data.map((coin) => {
          if (typeof coin === "string") {
            return { value: coin, label: coin }
          }
          return coin
        })
        setAvailableCoins(formattedCoins)
      }
    } catch (error) {
      console.error("Error fetching available coins:", error)
      // Fallback to some default coins
      setAvailableCoins([
        { value: "BTC/USDT", label: "Bitcoin (BTC/USDT)" },
        { value: "ETH/USDT", label: "Ethereum (ETH/USDT)" },
        { value: "SOL/USDT", label: "Solana (SOL/USDT)" },
        { value: "XRP/USDT", label: "Ripple (XRP/USDT)" },
        { value: "ADA/USDT", label: "Cardano (ADA/USDT)" },
      ])
    }
  }

  const handleCoinToggle = (coin: string) => {
    setSelectedCoins((prev) => {
      if (prev.includes(coin)) {
        return prev.filter((c) => c !== coin)
      } else {
        return [...prev, coin]
      }
    })
  }

  const handleSelectAll = () => {
    if (selectedCoins.length === availableCoins.length) {
      setSelectedCoins([])
    } else {
      setSelectedCoins(availableCoins.map((coin) => coin.value))
    }
  }

  const handleCollectData = async () => {
    if (selectedCoins.length === 0) {
      setStatus({
        success: false,
        message: "Please select at least one coin to collect data for.",
      })
      return
    }

    setIsLoading(true)
    setStatus(null)

    try {
      console.log("Collecting data for coins:", selectedCoins)
      const response = await fetch("http://localhost:5000/api/collect-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: selectedCoins,
          timeframe: selectedTimeframe,
          collect_news: collectNews,
          generate_signals: generateSignals,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Data collection response:", data)

      // Store collection history in localStorage
      try {
        const timestamp = new Date().toISOString()
        const historyItems = selectedCoins.map((symbol) => ({
          symbol,
          timestamp,
          market_data: data.results?.market_data || 0,
          technical_features: data.results?.technical_features || 0,
          signals: data.results?.signals || 0,
          news: data.results?.news || 0,
        }))

        // Get existing history
        const existingHistory = JSON.parse(localStorage.getItem("dataCollectionHistory") || "[]")

        // Add new items and limit to last 20
        const updatedHistory = [...historyItems, ...existingHistory].slice(0, 20)

        // Save back to localStorage
        localStorage.setItem("dataCollectionHistory", JSON.stringify(updatedHistory))

        // Dispatch event to notify other components
        console.log("Dispatching dataCollected event")
        const dataCollectedEvent = new Event("dataCollected")
        window.dispatchEvent(dataCollectedEvent)
      } catch (e) {
        console.error("Error saving collection history:", e)
      }

      setStatus({
        success: true,
        message: data.message || "Data collection completed successfully!",
      })
    } catch (error) {
      console.error("Error collecting data:", error)
      setStatus({
        success: false,
        message: "Failed to collect data. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Database className="mr-2 h-4 w-4" />
          Collect Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Collect Cryptocurrency Data</DialogTitle>
          <DialogDescription>Select cryptocurrencies and options for data collection.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="timeframe">Timeframe</Label>
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger id="timeframe">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1 Minute</SelectItem>
                <SelectItem value="5m">5 Minutes</SelectItem>
                <SelectItem value="15m">15 Minutes</SelectItem>
                <SelectItem value="30m">30 Minutes</SelectItem>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="4h">4 Hours</SelectItem>
                <SelectItem value="1d">1 Day</SelectItem>
                <SelectItem value="1w">1 Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Cryptocurrencies</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedCoins.length === availableCoins.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <ScrollArea className="h-[200px] rounded-md border p-2">
              <div className="grid gap-2">
                {availableCoins.map((coin) => (
                  <div key={coin.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`coin-${coin.value}`}
                      checked={selectedCoins.includes(coin.value)}
                      onCheckedChange={() => handleCoinToggle(coin.value)}
                    />
                    <Label htmlFor={`coin-${coin.value}`} className="flex-1 cursor-pointer">
                      {coin.label}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="collect-news"
              checked={collectNews}
              onCheckedChange={(checked) => setCollectNews(checked === true)}
            />
            <Label htmlFor="collect-news">Collect news and sentiment data</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="generate-signals"
              checked={generateSignals}
              onCheckedChange={(checked) => setGenerateSignals(checked === true)}
            />
            <Label htmlFor="generate-signals">Generate trading signals</Label>
          </div>

          {status && (
            <Alert variant={status.success ? "default" : "destructive"}>
              {status.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCollectData} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Collecting...
              </>
            ) : (
              "Collect Data"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
