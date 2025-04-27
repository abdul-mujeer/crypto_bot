"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"

interface NewsItem {
  id: string
  timestamp: string
  source: string
  headline: string
  snippet: string
  url: string
  sentiment_score: number
  sentiment_label: string
  related_coins: string
}

export function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNews() {
      try {
        // Fetch from your API
        const response = await fetch("http://localhost:5000/api/news?hours=24")
        const data = await response.json()

        // Use the actual API response data
        setNews(data)

        // Log the data for debugging
        console.log("News data from API:", data)
      } catch (error) {
        console.error("Error fetching news:", error)
        setNews([]) // Set empty array on error
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  if (loading) {
    return <div className="text-center py-4">Loading news...</div>
  }

  if (news.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No recent news available. Check back later for updates.
      </div>
    )
  }

  // Function to determine sentiment badge color
  const getSentimentColor = (score: number) => {
    if (score >= 0.6) return "bg-green-100 text-green-800"
    if (score >= 0.4) return "bg-blue-100 text-blue-800"
    if (score >= 0) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  // Function to get sentiment label
  const getSentimentLabel = (score: number) => {
    if (score >= 0.6) return "Positive"
    if (score >= 0.4) return "Neutral"
    if (score >= 0) return "Slightly Negative"
    return "Negative"
  }

  return (
    <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
      {news.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <Badge variant="outline" className="text-xs">
                {item.source || "News Source"}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(item.timestamp).toLocaleString()}</span>
            </div>

            <h3 className="font-medium mb-1 line-clamp-2">{item.headline}</h3>

            <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{item.snippet}</p>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Badge className={getSentimentColor(item.sentiment_score)}>
                  {item.sentiment_label || getSentimentLabel(item.sentiment_score)}
                </Badge>
                <span className="text-xs">Score: {item.sentiment_score.toFixed(2)}</span>
              </div>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  Read more <ExternalLink size={12} />
                </a>
              )}
            </div>

            {item.related_coins && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.related_coins.split(",").map((coin, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {coin.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Add this default export
export default NewsWidget
