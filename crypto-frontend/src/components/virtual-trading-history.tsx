"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"

interface Trade {
  id: string
  order_id: string
  timestamp: string
  symbol: string
  type: string
  amount: number
  price: number
  cost: number
  fee: number
}

export function VirtualTradingHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrades() {
      try {
        const response = await fetch("http://localhost:5000/api/virtual/trades")
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        const data = await response.json()
        setTrades(data)
      } catch (error) {
        console.error("Error fetching trades:", error)
        setTrades([])
      } finally {
        setLoading(false)
      }
    }

    fetchTrades()

    // Refresh trades when virtual trading occurs
    const interval = setInterval(fetchTrades, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Virtual Trading History</CardTitle>
          <CardDescription>Your virtual trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading trading history...</div>
        </CardContent>
      </Card>
    )
  }

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Virtual Trading History</CardTitle>
          <CardDescription>Your virtual trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No trading history yet. Start trading to see your activity here.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtual Trading History</CardTitle>
        <CardDescription>Your virtual trading activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 font-medium">
                <th className="py-3 px-4 text-left">Date</th>
                <th className="py-3 px-4 text-left">Symbol</th>
                <th className="py-3 px-4 text-left">Type</th>
                <th className="py-3 px-4 text-left">Amount</th>
                <th className="py-3 px-4 text-left">Price</th>
                <th className="py-3 px-4 text-left">Total</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b">
                  <td className="py-3 px-4">{new Date(trade.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-4">{trade.symbol}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={`${trade.type === "BUY" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                    >
                      {trade.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">{trade.amount.toFixed(8)}</td>
                  <td className="py-3 px-4">${formatPrice(trade.price)}</td>
                  <td className="py-3 px-4">${formatPrice(trade.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
