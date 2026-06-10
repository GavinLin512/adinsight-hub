import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { sourceChartConfig } from '@/lib/chart-config'
import type { ChartConfig } from '@/components/ui/chart'
import type { SourceKpi } from '@/types'

const strategyChartConfig = {
  roas: { label: 'ROAS (x)', color: 'hsl(var(--chart-1))' },
  cpa:  { label: 'CPA (NT$)', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig

export default function StrategyKpiChart({ bySource }: { bySource: SourceKpi[] }) {
  const data = (bySource || []).map((s) => ({
    source: sourceChartConfig[s.source as keyof typeof sourceChartConfig]?.label ?? s.source,
    roas: s.roas ?? undefined,
    cpa:  s.cpa  ?? undefined,
  }))

  const hasAny = data.some((d) => d.roas != null || d.cpa != null)
  if (!hasAny) return <p className="text-sm text-muted-foreground">尚無策略圖表資料</p>

  return (
    <div>
      <ChartContainer config={strategyChartConfig} className="aspect-auto h-[280px] w-full">
        <BarChart data={data} margin={{ top: 8, right: 24 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="source" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={(v: number) => `${v}x`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) =>
                  name === 'roas'
                    ? `${value}x`
                    : `NT$${Number(value).toLocaleString()}`
                }
              />
            }
          />
          <Bar yAxisId="left"  dataKey="roas" fill="var(--color-roas)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar yAxisId="right" dataKey="cpa"  fill="var(--color-cpa)"  radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ChartContainer>
      <p className="mt-1 text-xs text-muted-foreground">
        ROAS 越高越好(左軸)・CPA 越低越好(右軸)
      </p>
    </div>
  )
}
