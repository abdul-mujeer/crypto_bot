"use client"

import { useEffect, useRef } from "react"

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  lineWidth?: number
  isPositive?: boolean
}

export function SparklineChart({
  data,
  width = 80,
  height = 30,
  color,
  lineWidth = 1.5,
  isPositive = true,
}: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set line style
    ctx.strokeStyle = color || (isPositive ? "#22c55e" : "#ef4444")
    ctx.lineWidth = lineWidth

    // Calculate step and scale
    const step = width / (data.length - 1)
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1 // Avoid division by zero
    const scale = height / range

    // Start drawing
    ctx.beginPath()
    ctx.moveTo(0, height - (data[0] - min) * scale)

    // Draw lines
    for (let i = 1; i < data.length; i++) {
      const x = i * step
      const y = height - (data[i] - min) * scale
      ctx.lineTo(x, y)
    }

    ctx.stroke()
  }, [data, width, height, color, lineWidth, isPositive])

  return <canvas ref={canvasRef} width={width} height={height} className="inline-block" />
}
