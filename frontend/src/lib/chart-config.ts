import type { ChartConfig } from '@/components/ui/chart'

// 各來源共用色票與標籤(shadcn Charts chartConfig)
export const sourceChartConfig = {
  google: { label: 'Google', color: 'hsl(var(--chart-1))' },
  meta: { label: 'Meta', color: 'hsl(var(--chart-2))' },
  ga4: { label: 'GA4', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig

export const trendChartConfig = {
  cost: { label: '花費', color: 'hsl(var(--chart-5))' },
  revenue: { label: '收入', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig
