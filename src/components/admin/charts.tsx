import { ArrowUpRightIcon, ArrowDownRightIcon, MinusIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type SparklineProps = {
  values: number[]
  className?: string
  width?: number
  height?: number
  fill?: boolean
}

export function Sparkline({
  values,
  className,
  width = 120,
  height = 32,
  fill = true,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none" />
    )
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return [x, y] as const
  })
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(2)},${height} L${points[0][0].toFixed(2)},${height} Z`
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {fill && <path d={areaPath} fill="currentColor" opacity="0.12" />}
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TrendPill({ delta, suffix = '%' }: { delta: number | null; suffix?: string }) {
  if (delta === null || !isFinite(delta)) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const flat = Math.abs(delta) < 0.5
  const positive = delta > 0
  const Icon = flat ? MinusIcon : positive ? ArrowUpRightIcon : ArrowDownRightIcon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
        flat
          ? 'bg-muted text-muted-foreground'
          : positive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400'
      )}
    >
      <Icon className="size-3" />
      {Math.abs(delta).toFixed(1)}
      {suffix}
    </span>
  )
}

type LineChartProps = {
  values: number[]
  labels: string[]
  className?: string
  height?: number
  formatValue?: (v: number) => string
}

export function LineChart({
  values,
  labels,
  className,
  height = 160,
  formatValue = (v) => v.toString(),
}: LineChartProps) {
  const width = 800
  const padding = { top: 10, right: 8, bottom: 22, left: 36 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(...values, 1)
  const min = 0
  const range = max - min || 1

  const xAt = (i: number) =>
    padding.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW)
  const yAt = (v: number) => padding.top + innerH - ((v - min) / range) * innerH

  const points = values.map((v, i) => [xAt(i), yAt(v)] as const)
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(2)},${padding.top + innerH} L${points[0][0].toFixed(2)},${padding.top + innerH} Z`

  // Y-axis ticks: 4 levels
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => max * p)
  // X-axis labels: show every Nth label so they don't overlap
  const labelStep = Math.max(1, Math.ceil(values.length / 6))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('w-full text-primary', className)}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend chart"
    >
      {/* Grid */}
      {ticks.map((t, i) => {
        const y = yAt(t)
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeDasharray="2 3"
              strokeWidth="0.5"
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-muted-foreground text-[9px] tabular-nums"
            >
              {formatValue(t)}
            </text>
          </g>
        )
      })}
      {/* Area + line */}
      <path d={areaPath} fill="currentColor" opacity="0.1" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last-point dot */}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="2.5"
          fill="currentColor"
        />
      )}
      {/* X labels */}
      {labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== labels.length - 1) return null
        return (
          <text
            key={i}
            x={xAt(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}

type BarChartProps = {
  values: number[]
  labels: string[]
  className?: string
  height?: number
}

export function BarChart({ values, labels, className, height = 120 }: BarChartProps) {
  const width = 400
  const padding = { top: 4, right: 4, bottom: 18, left: 4 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(...values, 1)
  const slotW = innerW / values.length
  const barW = Math.max(2, slotW * 0.7)
  const labelStep = Math.max(1, Math.ceil(values.length / 8))

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('w-full text-primary', className)}
      preserveAspectRatio="none"
      role="img"
      aria-label="Bar chart"
    >
      {values.map((v, i) => {
        const h = (v / max) * innerH
        const x = padding.left + i * slotW + (slotW - barW) / 2
        const y = padding.top + innerH - h
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={Math.max(1, h)}
            rx="1.5"
            fill="currentColor"
            opacity={v === 0 ? 0.15 : 0.65}
          />
        )
      })}
      {labels.map((label, i) => {
        if (i % labelStep !== 0 && i !== labels.length - 1) return null
        return (
          <text
            key={i}
            x={padding.left + i * slotW + slotW / 2}
            y={height - 5}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px]"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
