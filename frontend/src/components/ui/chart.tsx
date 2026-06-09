import * as React from 'react'
import * as RechartsPrimitive from 'recharts'
import { cn } from '@/lib/utils'

const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
    theme?: Record<keyof typeof THEMES, string>
  }
}

type ChartContextProps = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) throw new Error('useChart must be used within a <ChartContainer />')
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<'div'> & {
    config: ChartConfig
    children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-none",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = 'Chart'

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, c]) => c.theme || c.color)
  if (!colorConfig.length) return null
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof THEMES] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .filter(Boolean)
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

type TooltipContentProps = {
  active?: boolean
  // recharts payload 形狀於不同圖型不一,使用寬鬆型別
  payload?: Array<Record<string, any>>
  className?: string
  indicator?: 'dot' | 'line'
  hideLabel?: boolean
  hideIndicator?: boolean
  label?: React.ReactNode
  labelFormatter?: (label: React.ReactNode, payload: Array<Record<string, any>>) => React.ReactNode
  formatter?: (value: any, name: any, item: Record<string, any>, index: number) => React.ReactNode
  color?: string
  nameKey?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    { active, payload, className, indicator = 'dot', hideLabel = false, hideIndicator = false, label, labelFormatter, formatter, color, nameKey },
    ref,
  ) => {
    const { config } = useChart()
    if (!active || !payload?.length) return null

    return (
      <div
        ref={ref}
        className={cn(
          'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl',
          className,
        )}
      >
        {!hideLabel && label != null && (
          <div className="font-medium">{labelFormatter ? labelFormatter(label, payload) : label}</div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || 'value'}`
            const itemConfig = config[key]
            const indicatorColor = color || item.payload?.fill || item.color
            return (
              <div key={item.dataKey ?? index} className="flex w-full items-center gap-2">
                {!hideIndicator && (
                  <div
                    className={cn('shrink-0 rounded-[2px]', indicator === 'dot' ? 'h-2.5 w-2.5' : 'w-1')}
                    style={{ backgroundColor: indicatorColor }}
                  />
                )}
                <div className="flex flex-1 justify-between leading-none">
                  <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                  {item.value != null && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {formatter ? formatter(item.value, item.name, item, index) : item.value.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  },
)
ChartTooltipContent.displayName = 'ChartTooltipContent'

const ChartLegend = RechartsPrimitive.Legend

type LegendContentProps = {
  className?: string
  payload?: Array<Record<string, any>>
  nameKey?: string
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, LegendContentProps>(
  ({ className, payload, nameKey }, ref) => {
    const { config } = useChart()
    if (!payload?.length) return null
    return (
      <div ref={ref} className={cn('flex items-center justify-center gap-4 pt-3', className)}>
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || 'value'}`
          const itemConfig = config[key]
          return (
            <div key={String(item.value)} className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
              {itemConfig?.label ?? item.value}
            </div>
          )
        })}
      </div>
    )
  },
)
ChartLegendContent.displayName = 'ChartLegendContent'

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle }
