import { Bar, BarChart, Cell, ReferenceLine, XAxis, YAxis } from 'recharts'
import ChartNote from '@/components/ChartNote'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { sourceChartConfig } from '@/lib/chart-config'
import type { ChartConfig } from '@/components/ui/chart'
import type { InsightMetric } from '@/types'

// 效率落差 = 營收佔比 − 預算佔比,以「百分點(pp)」呈現;正=該加、負=該減
const gapChartConfig = {
  gap: { label: '效率落差 (pp)' },
} satisfies ChartConfig

const POS = 'hsl(172 50% 30%)' // 青綠(主色系):多賺少花
const NEG = 'hsl(12 55% 52%)'  // 赤陶(花費色系):多花少賺

export default function EfficiencyGapChart({ metrics }: { metrics: InsightMetric[] }) {
  const data = (metrics || [])
    .filter((m) => m.efficiency_gap != null)
    .map((m) => ({
      source: sourceChartConfig[m.source as keyof typeof sourceChartConfig]?.label ?? m.source,
      gap: Number((m.efficiency_gap! * 100).toFixed(1)),
    }))

  if (data.length === 0) return <p className="text-sm text-muted-foreground">尚無效率落差資料</p>

  return (
    <div>
      <ChartContainer config={gapChartConfig} className="h-[220px] w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 32, left: 8 }}>
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}pp`}
          />
          <YAxis type="category" dataKey="source" tickLine={false} axisLine={false} width={72} />
          <ReferenceLine x={0} stroke="hsl(var(--border))" />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => `${Number(value) > 0 ? '+' : ''}${value} pp`}
              />
            }
          />
          <Bar dataKey="gap" radius={4} maxBarSize={28}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.gap >= 0 ? POS : NEG} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
      <ChartNote formula="效率落差 = 營收佔比 − 預算佔比(以百分點 pp 呈現)">
        <span className="text-primary">正(墨綠)代表多賺少花、該加</span>、
        <span className="text-destructive">負(赤紅)代表多花少賺、該減</span>
      </ChartNote>
    </div>
  )
}
