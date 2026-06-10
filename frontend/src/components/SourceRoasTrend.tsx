import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import { sourceChartConfig } from '@/lib/chart-config'
import type { SourceTimeseriesPoint } from '@/types'

const SOURCES = ['google', 'meta', 'ga4'] as const

// 將扁平的 (date, source, roas) pivot 成 { date, google, meta, ga4 },呈現每日各來源 ROAS 折線。
export default function SourceRoasTrend({ data, days = 14 }: { data: SourceTimeseriesPoint[]; days?: number }) {
  const byDate = new Map<string, Record<string, number | null>>()
  for (const row of data || []) {
    if (!byDate.has(row.date)) byDate.set(row.date, {})
    byDate.get(row.date)![row.source] = row.roas
  }

  const series = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-days)
    .map(([date, vals]) => ({
      date: date.slice(5),
      google: vals.google ?? null,
      meta: vals.meta ?? null,
      ga4: vals.ga4 ?? null,
    }))

  if (series.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無資料</p>
  }

  return (
    <ChartContainer config={sourceChartConfig} className="aspect-auto h-[300px] w-full">
      <LineChart data={series} margin={{ top: 8, right: 12, left: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}x`} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}x`} />} />
        <ChartLegend content={<ChartLegendContent />} />
        {SOURCES.map((s) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={`var(--color-${s})`}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
