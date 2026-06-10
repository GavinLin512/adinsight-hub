import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import { trendChartConfig } from '@/lib/chart-config'
import type { TimeseriesPoint } from '@/types'

// 最近 N 天每日花費 / 收入趨勢。切換檢視截止日時這張圖會明顯變化。
export default function TrendChart({ data, days = 14 }: { data: TimeseriesPoint[]; days?: number }) {
  const series = (data || []).slice(-days).map((d) => ({
    date: d.date.slice(5), // MM-DD
    cost: Math.round(d.cost_twd),
    revenue: Math.round(d.revenue_twd),
  }))

  if (series.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無趨勢資料</p>
  }

  return (
    <ChartContainer config={trendChartConfig} className="aspect-auto h-[300px] w-full">
      <LineChart data={series} margin={{ top: 8, right: 12, left: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `NT$${Number(v).toLocaleString()}`} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  )
}
