"use client"

import { useEffect, useRef } from "react"

interface TradingViewChartProps {
  symbol: string
  interval: string
  theme?: "light" | "dark"
  autosize?: boolean
  height?: number
  width?: number
}

export function TradingViewChart({
  symbol,
  interval,
  theme = "light",
  autosize = true,
  height = 500,
  width = 800,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Clean up any existing widgets
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
    }

    // Create the widget script
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/tv.js"
    script.async = true
    script.onload = () => {
      if (typeof window.TradingView !== "undefined" && containerRef.current) {
        new window.TradingView.widget({
          autosize,
          symbol: `BINANCE:${symbol}`,
          interval,
          timezone: "Etc/UTC",
          theme,
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: containerRef.current.id,
          hide_side_toolbar: false,
          studies: [
            "MASimple@tv-basicstudies", // Simple Moving Average
            "RSI@tv-basicstudies", // Relative Strength Index
            "MACD@tv-basicstudies", // Moving Average Convergence Divergence
            "BB@tv-basicstudies", // Bollinger Bands
            "StochasticRSI@tv-basicstudies", // Stochastic RSI
            "AwesomeOscillator@tv-basicstudies", // Awesome Oscillator
            "VolumeMa@tv-basicstudies", // Volume Moving Average
          ],
          save_image: true,
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          withdateranges: true,
          hide_top_toolbar: false,
          details: true,
          hotlist: true,
          calendar: true,
          studies_overrides: {},
          overrides: {
            "mainSeriesProperties.candleStyle.upColor": "#22c55e",
            "mainSeriesProperties.candleStyle.downColor": "#ef4444",
            "mainSeriesProperties.candleStyle.borderUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.borderDownColor": "#ef4444",
            "mainSeriesProperties.candleStyle.wickUpColor": "#22c55e",
            "mainSeriesProperties.candleStyle.wickDownColor": "#ef4444",
          },
        })
      }
    }
    document.head.appendChild(script)

    return () => {
      // Clean up
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [symbol, interval, theme, autosize])

  return (
    <div
      id={`tradingview_${symbol}_${interval}`}
      ref={containerRef}
      style={{ height: autosize ? "100%" : height, width: autosize ? "100%" : width }}
    />
  )
}
