import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart'
import { sourceChartConfig } from '@/lib/chart-config'
import type { SourceKpi } from '@/types'

export default function BudgetPie({ bySource }: { bySource: SourceKpi[] }) {
  const data = (bySource || [])
    .filter((s) => s.cost_twd > 0)
    .map((s) => ({ source: s.source, value: Math.round(s.cost_twd) }))

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">尚無預算資料</p>
  }

  return (
    <ChartContainer config={sourceChartConfig} className="aspect-auto h-[280px] w-full">
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="source" formatter={(v) => `NT$${Number(v).toLocaleString()}`} />}
        />
        <Pie data={data} dataKey="value" nameKey="source" outerRadius={100}>
          {data.map((d) => (
            <Cell key={d.source} fill={`var(--color-${d.source})`} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="source" />} />
      </PieChart>
    </ChartContainer>
  )
}
