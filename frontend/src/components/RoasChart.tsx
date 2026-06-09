import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { sourceChartConfig } from '@/lib/chart-config'
import type { SourceKpi } from '@/types'

export default function RoasChart({ bySource }: { bySource: SourceKpi[] }) {
  const data = (bySource || [])
    .filter((s) => s.roas != null)
    .map((s) => ({ source: s.source, roas: s.roas as number }))

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無 ROAS 資料</p>
  }

  return (
    <ChartContainer config={sourceChartConfig} className="h-[280px] w-full">
      <BarChart data={data} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="source"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v: string) => sourceChartConfig[v as keyof typeof sourceChartConfig]?.label ?? v}
        />
        <YAxis tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => `${v}x`} />} />
        <Bar dataKey="roas" radius={6}>
          {data.map((d) => (
            <Cell key={d.source} fill={`var(--color-${d.source})`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
