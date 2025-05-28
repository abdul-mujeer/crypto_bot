"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface VirtualTradingPanelProps {
  symbol: string
  currentPrice: number
}

interface Balance {
  currency: string
  amount: number
}

interface Portfolio {
  total_value: number
  holdings: Array<{
    currency: string
    amount: number
    price: number
    value: number
  }>
  usdt_balance: number
  profit_loss: number
  profit_loss_pct: number
  initial_value: number
}

export function VirtualTradingPanel({ symbol, currentPrice }: VirtualTradingPanelProps) {
  const [amount, setAmount] = useState("")
  const [orderType, setOrderType] = useState<"BUY" | "SELL">("BUY")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [balances, setBalances] = useState<Balance[]>([])
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null)

  // Extract base currency from symbol (e.g., "BTC" from "BTC/USDT")
  const baseCurrency = symbol.split("/")[0]
  const quoteCurrency = symbol.split("/")[1] || "USDT"

  // Get current balance of base and quote currencies
  const baseBalance = balances.find((b) => b.currency === baseCurrency)?.amount || 0
  const quoteBalance = balances.find((b) => b.currency === quoteCurrency)?.amount || 0

  // Calculate maximum amount that can be bought/sold
  const maxBuyAmount = quoteBalance / currentPrice
  const maxSellAmount = baseBalance

  useEffect(() => {
    fetchBalances()
    fetchPortfolio()
  }, [])

  async function fetchBalances() {
    try {
      const response = await fetch("http://localhost:5000/api/virtual/balance")
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      const data = await response.json()
      setBalances(data)
    } catch (error) {
      console.error("Error fetching balances:", error)
    }
  }

  async function fetchPortfolio() {
    try {
      const response = await fetch("http://localhost:5000/api/virtual/portfolio")
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      const data = await response.json()
      setPortfolio(data)
    } catch (error) {
      console.error("Error fetching portfolio:", error)
    }
  }

  async function handleTrade() {
    if (!amount || isNaN(Number.parseFloat(amount)) || Number.parseFloat(amount) <= 0) {
      setStatus({
        success: false,
        message: "Please enter a valid amount",
      })
      return
    }

    setLoading(true)
    setStatus(null)

    try {
      const response = await fetch("http://localhost:5000/api/virtual/trade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbol,
          type: orderType,
          amount: Number.parseFloat(amount),
          price: currentPrice,
        }),
      })

      const data = await response.json()

      setStatus({
        success: data.success,
        message: data.message,
      })

      if (data.success) {
        // Reset amount field
        setAmount("")
        // Refresh balances and portfolio
        fetchBalances()
        fetchPortfolio()
      }
    } catch (error) {
      console.error("Error executing trade:", error)
      setStatus({
        success: false,
        message: "Failed to execute trade. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSetMaxAmount() {
    if (orderType === "BUY") {
      // Set max buy amount (95% of max to account for fees)
      setAmount((maxBuyAmount * 0.95).toFixed(8))
    } else {
      // Set max sell amount
      setAmount(maxSellAmount.toFixed(8))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Virtual Trading</CardTitle>
        <CardDescription>Trade with virtual funds - no real money involved</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trade" className="space-y-4">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          </TabsList>

          <TabsContent value="trade" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={orderType === "BUY" ? "default" : "outline"}
                className={orderType === "BUY" ? "bg-green-600 hover:bg-green-700" : ""}
                onClick={() => setOrderType("BUY")}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Buy
              </Button>
              <Button
                variant={orderType === "SELL" ? "default" : "outline"}
                className={orderType === "SELL" ? "bg-red-600 hover:bg-red-700" : ""}
                onClick={() => setOrderType("SELL")}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                Sell
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="amount">Amount ({baseCurrency})</Label>
                <button type="button" onClick={handleSetMaxAmount} className="text-xs text-blue-600 hover:underline">
                  Max
                </button>
              </div>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.00000001"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Price ({quoteCurrency})</Label>
              <div className="text-lg font-bold">{formatPrice(currentPrice)}</div>
            </div>

            <div className="space-y-2">
              <Label>Total ({quoteCurrency})</Label>
              <div className="text-lg font-bold">{formatPrice(Number.parseFloat(amount || "0") * currentPrice)}</div>
            </div>

            <div className="space-y-2">
              <Label>Available Balance</Label>
              <div className="flex justify-between text-sm">
                <span>
                  {baseCurrency}: {baseBalance.toFixed(8)}
                </span>
                <span>
                  {quoteCurrency}: {formatPrice(quoteBalance)}
                </span>
              </div>
            </div>

            {status && (
              <Alert variant={status.success ? "default" : "destructive"}>
                {status.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            {portfolio ? (
              <>
                <div className="space-y-2">
                  <Label>Total Portfolio Value</Label>
                  <div className="text-2xl font-bold">{formatPrice(portfolio.total_value)} USDT</div>
                  <div className={`text-sm ${portfolio.profit_loss >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {portfolio.profit_loss >= 0 ? "+" : ""}
                    {formatPrice(portfolio.profit_loss)} USDT ({portfolio.profit_loss_pct.toFixed(2)}%)
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Available Balance</Label>
                  <div className="text-lg font-bold">{formatPrice(portfolio.usdt_balance)} USDT</div>
                </div>

                <div className="space-y-2">
                  <Label>Holdings</Label>
                  {portfolio.holdings.length > 0 ? (
                    <div className="space-y-2">
                      {portfolio.holdings.map((holding) => (
                        <div key={holding.currency} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <div className="font-medium">{holding.currency}</div>
                            <div className="text-sm text-muted-foreground">
                              {holding.amount.toFixed(8)} × {formatPrice(holding.price)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatPrice(holding.value)} USDT</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No holdings yet</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">Loading portfolio...</div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        {portfolio && (
          <div className="text-sm text-muted-foreground">Initial: {formatPrice(portfolio.initial_value)} USDT</div>
        )}
        <Button onClick={handleTrade} disabled={loading} className="ml-auto">
          {loading ? (
            <>Loading...</>
          ) : (
            <>
              {orderType === "BUY" ? (
                <TrendingUp className="mr-2 h-4 w-4" />
              ) : (
                <TrendingDown className="mr-2 h-4 w-4" />
              )}
              {orderType} {baseCurrency}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
