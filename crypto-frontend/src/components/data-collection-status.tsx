"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Database } from "lucide-react"

interface CollectionHistory {
  symbol: string
  timestamp: string
  market_data: number
  technical_features: number
  signals: number
  news: number
}

export function DataCollectionStatus() {
  const [history, setHistory] = useState<CollectionHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // This would be a real endpoint in your application
    // For now, we'll simulate it with localStorage
    const fetchCollectionHistory = () => {
      try {
        const storedHistory = localStorage.getItem("dataCollectionHistory")
        if (storedHistory) {
          setHistory(JSON.parse(storedHistory))
        }
      } catch (error) {
        console.error("Error fetching collection history:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchCollectionHistory()

    // Listen for new data collection events
    window.addEventListener("dataCollected", fetchCollectionHistory)

    return () => {
      window.removeEventListener("dataCollected", fetchCollectionHistory)
    }
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Collection History</CardTitle>
          <CardDescription>Recent data collection activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading history...</div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Collection History</CardTitle>
          <CardDescription>Recent data collection activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No data collection history available. Use the "Collect Data" button to start collecting data.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Collection History</CardTitle>
        <CardDescription>Recent data collection activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={index} className="border rounded-md p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{item.symbol}</h3>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  {item.market_data + item.technical_features + item.signals + item.news} records
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Market Data:</span> {item.market_data}
                </div>
                <div>
                  <span className="text-muted-foreground">Technical Features:</span> {item.technical_features}
                </div>
                <div>
                  <span className="text-muted-foreground">Signals:</span> {item.signals}
                </div>
                <div>
                  <span className="text-muted-foreground">News:</span> {item.news}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
