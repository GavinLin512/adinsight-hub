import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import BudgetPie from '@/components/BudgetPie'
import InsightCard from '@/components/InsightCard'
import RoasChart from '@/components/RoasChart'
import TrendChart from '@/components/TrendChart'
import { getInsights, getSummary, getTimeseries } from '@/api'
import { lastNDates } from '@/lib/dates'
import type { AnalyticsSummary, InsightOut, TimeseriesPoint } from '@/types'

const DATES = lastNDates(7)

const KPI_TIPS: Record<string, string> = {
  ROAS:
    'ROAS(廣告投資報酬率):每花 1 元廣告費帶回多少營收。例如 4x 代表花 1 元賺回 4 元,數字越高越好。',
  CPA:
    'CPA(每次轉換成本):平均花多少廣告費才換到一筆「轉換」(例如成交、註冊、加入購物車),數字越低越划算。',
  CTR:
    'CTR(點擊率):廣告每被看到 100 次,有多少次被點擊。反映廣告吸不吸引人,數字越高越好。',
}

function Kpi({ label, value, tip }: { label: string; value: string; tip?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {label}
          {tip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`${label} 說明`}
                  className="inline-flex text-muted-foreground/70 hover:text-foreground"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="mt-1.5 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function PublicDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([])
  const [insights, setInsights] = useState<InsightOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewDate, setViewDate] = useState(DATES[0].iso)

  async function load(endDate: string) {
    setLoading(true)
    setError(null)
    try {
      const [s, ts, i] = await Promise.all([getSummary(endDate), getTimeseries(endDate), getInsights()])
      setSummary(s)
      setTimeseries(ts)
      setInsights(i)
    } catch {
      setError('無法連到後端 API,請確認後端已啟動。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(viewDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function onDateChange(v: string) {
    setViewDate(v)
    load(v)
  }

  const overall = summary?.overall
  const hasData = !!overall && overall.cost_twd > 0

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">行銷成效儀表板</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">檢視截止日</span>
          <Select value={viewDate} onValueChange={onDateChange}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DATES.map((d) => <SelectItem key={d.iso} value={d.iso}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}
      {loading && <p className="text-muted-foreground">載入中…</p>}

      {!loading && !hasData && !error && (
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            尚無資料,請至<Link to="/admin" className="mx-1 text-primary underline">後台控制台</Link>執行 ETL 產生資料。
          </CardContent>
        </Card>
      )}

      {!loading && hasData && overall && summary && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="總花費 (TWD)" value={`NT$${Math.round(overall.cost_twd).toLocaleString()}`} />
            <Kpi label="整體 ROAS" value={overall.roas != null ? `${overall.roas}x` : '—'} tip={KPI_TIPS.ROAS} />
            <Kpi label="整體 CPA" value={overall.cpa != null ? `NT$${overall.cpa}` : '—'} tip={KPI_TIPS.CPA} />
            <Kpi label="整體 CTR" value={overall.ctr != null ? `${(overall.ctr * 100).toFixed(2)}%` : '—'} tip={KPI_TIPS.CTR} />
          </div>

          <Card>
            <CardHeader><CardTitle>每日花費 / 收入趨勢(最近 14 天)</CardTitle></CardHeader>
            <CardContent>
              <TrendChart data={timeseries} />
              <p className="mt-2 text-xs text-muted-foreground">切換右上「檢視截止日」,趨勢圖會即時變化。</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>各來源 ROAS</CardTitle></CardHeader>
              <CardContent>
                <RoasChart bySource={summary.by_source} />
                <p className="mt-2 text-xs text-muted-foreground">ROAS 為比例,加入更多相似日子比例幾乎不變,屬正常。</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>預算分配</CardTitle></CardHeader>
              <CardContent><BudgetPie bySource={summary.by_source} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>AI 行銷洞察</CardTitle></CardHeader>
            <CardContent><InsightCard insights={insights} /></CardContent>
          </Card>
        </>
      )}
    </div>
    </TooltipProvider>
  )
}
