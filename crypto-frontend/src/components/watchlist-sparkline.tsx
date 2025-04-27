"use client"

interface WatchlistSparklineProps {
  data: number[]
  color: string
  width?: number
  height?: number
}

export function WatchlistSparkline({ data, color, width = 80, height = 20 }: WatchlistSparklineProps) {
  // Generate sample data if none provided
  const chartData = data.length > 0 ? data : Array.from({ length: 20 }, () => Math.random() * 10 + 90)

  // Calculate points for the SVG path
  const min = Math.min(...chartData)
  const max = Math.max(...chartData)
  const range = max - min || 1

  const points = chartData
    .map((value, index) => {
      const x = (index / (chartData.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
