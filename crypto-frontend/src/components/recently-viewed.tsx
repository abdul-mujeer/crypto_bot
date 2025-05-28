"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CryptoPrice {
  symbol: string
  price: number
  change: number
}

export function RecentlyViewed() {
  const [recentCoins, setRecentCoins] = useState<CryptoPrice[]>([])

  useEffect(() => {
    // In a real app, this would come from localStorage or a backend API
    // For now, we'll use mock data
    const mockRecentCoins = [
      { symbol: "DOGE-USD", price: 0.18024, change: -0.76 },
      { symbol: "SHIB-USD", price: 0.000014, change: -4.49 },
      { symbol: "BONK-USD", price: 0.0000197, change: 5.0 },
      { symbol: "FLOKI-USD", price: 0.000077, change: -4.84 },
      { symbol: "PYTH-USD", price: 0.154326, change: -5.0 },
      { symbol: "XRP-USD", price: 2.2445, change: 1.99 },
      { symbol: "PEPE-USD", price: 0.00000885, change: -3.17 },
      { symbol: "SOLVEX-USD", price: 0.114854, change: 2.89 },
    ]

    setRecentCoins(mockRecentCoins)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recently viewed</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {recentCoins.map((coin) => (
            <div key={coin.symbol} className="flex justify-between items-center py-2 px-4 hover:bg-muted/50">
              <div>
                <div className="font-medium">{coin.symbol}</div>
                <div className="text-sm text-muted-foreground">{formatSymbolName(coin.symbol)}</div>
              </div>
              <div className="text-right">
                <div>{formatPrice(coin.price)}</div>
                <div className={coin.change >= 0 ? "text-green-500" : "text-red-500"}>
                  {coin.change >= 0 ? "+" : ""}
                  {coin.change.toFixed(2)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function formatSymbolName(symbol: string): string {
  const parts = symbol.split("-")
  switch (parts[0]) {
    case "DOGE":
      return "Dogecoin USD"
    case "SHIB":
      return "Shiba Inu USD"
    case "BONK":
      return "Bonk USD"
    case "FLOKI":
      return "FLOKI USD"
    case "PYTH":
      return "Pyth Network USD"
    case "XRP":
      return "XRP USD"
    case "PEPE":
      return "Pepe USD"
    case "SOLVEX":
      return "Solvex Network USD"
    default:
      return `${parts[0]} USD`
  }
}

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
