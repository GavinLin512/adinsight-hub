import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import DatePicker from '@/components/DatePicker'
import BudgetPie from '@/components/BudgetPie'
import EfficiencyGapChart from '@/components/EfficiencyGapChart'
import InsightCard from '@/components/InsightCard'
import RoasChart from '@/components/RoasChart'
import SourceRoasTrend from '@/components/SourceRoasTrend'
import StrategyKpiChart from '@/components/StrategyKpiChart'
import TrendChart from '@/components/TrendChart'
import { toast } from 'sonner'
import { getInsights, getSummary, getTimeseries, getTimeseriesBySource } from '@/api'
import { fmtDate } from '@/lib/dates'
import type { AnalyticsSummary, InsightOut, SourceTimeseriesPoint, TimeseriesPoint } from '@/types'

const WINDOW_DAYS = 14 // 全儀表板統一視窗:截止日往回 14 天

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
  const [sourceTrend, setSourceTrend] = useState<SourceTimeseriesPoint[]>([])
  const [insights, setInsights] = useState<InsightOut | null>(null)
  const [strategySummary, setStrategySummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewDate, setViewDate] = useState(fmtDate(new Date()))
  const [etlProducing, setEtlProducing] = useState(false)

  async function loadOperational(endDate: string) {
    setLoading(true)
    setError(null)
    try {
      const [s, ts, sts] = await Promise.all([
        getSummary(endDate, WINDOW_DAYS), getTimeseries(endDate), getTimeseriesBySource(endDate),
      ])
      setSummary(s)
      setTimeseries(ts)
      setSourceTrend(sts)
    } catch {
      setError('無法連到後端 API,請確認後端已啟動。')
    } finally {
      setLoading(false)
    }
  }

  async function loadInsights() {
    try {
      const [i, strat] = await Promise.all([getInsights(), getSummary(null, 30)])
      setInsights(i)
      setStrategySummary(strat)
      // 預設「檢視截止日」對齊最新資料日(隨每次 ETL 最新日更動);
      // 與今天取數結果相同(營運視窗錨在 ≤ 截止日的最新資料日),故無需重抓
      if (i.data_date) setViewDate(i.data_date)
    } catch {
      // 洞察/策略摘要載入失敗不阻斷主儀表板
    }
  }

  useEffect(() => {
    loadOperational(viewDate)
    loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // 掛載時補讀:可能在本頁掛載前 ETL 就已開始(錯過即時廣播);5 分鐘內視為仍在產製
    try {
      const raw = localStorage.getItem('adinsight-etl')
      if (raw) {
        const { status, ts } = JSON.parse(raw) as { status: string; ts: number }
        if (status === 'running' && Date.now() - ts < 5 * 60 * 1000) setEtlProducing(true)
      }
    } catch {
      // 忽略解析錯誤
    }

    const bc = new BroadcastChannel('adinsight-etl')
    bc.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data.type === 'etl_started') {
        setEtlProducing(true)
      } else if (e.data.type === 'etl_done') {
        setEtlProducing(false)
        toast.success('報告已重新產生，請重新整理', {
          duration: Infinity,
          action: { label: '立即重新整理', onClick: () => window.location.reload() },
        })
      }
    }
    return () => bc.close()
  }, [])

  function onDateChange(v: string) {
    setViewDate(v)
    loadOperational(v)
    // 洞察為月度快照,不隨日期鈕重抓
  }

  const overall = summary?.overall
  const hasData = !!overall && overall.cost_twd > 0

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">行銷成效儀表板</h1>
          <p className="text-xs text-muted-foreground">所有數據為「報表檢視截止日」往回 {WINDOW_DAYS} 天</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          報表檢視截止日
          <DatePicker value={viewDate} onChange={onDateChange} max={insights?.data_date ?? fmtDate(new Date())} />
        </div>
      </div>

      {etlProducing && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          最新報表產製中，完成後將通知您…
        </div>
      )}
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
          <p className="text-sm font-medium text-muted-foreground">即時營運概覽 · 近 14 天</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="總花費 (TWD)" value={`NT$${Math.round(overall.cost_twd).toLocaleString()}`} />
            <Kpi label="整體 ROAS" value={overall.roas != null ? `${overall.roas}x` : '—'} tip={KPI_TIPS.ROAS} />
            <Kpi label="整體 CPA" value={overall.cpa != null ? `NT$${overall.cpa}` : '—'} tip={KPI_TIPS.CPA} />
            <Kpi label="整體 CTR" value={overall.ctr != null ? `${(overall.ctr * 100).toFixed(2)}%` : '—'} tip={KPI_TIPS.CTR} />
          </div>

          <Card>
            <CardHeader><CardTitle>每日花費 / 收入趨勢(最近 14 天)</CardTitle></CardHeader>
            <CardContent>
              <TrendChart data={timeseries} days={WINDOW_DAYS} />
              <p className="mt-2 text-xs text-muted-foreground">切換右上「檢視截止日」,趨勢圖會即時變化。</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>各來源每日 ROAS(最近 14 天)</CardTitle></CardHeader>
            <CardContent>
              <SourceRoasTrend data={sourceTrend} days={WINDOW_DAYS} />
              <p className="mt-2 text-xs text-muted-foreground">每日波動下,「哪家最高」會洗牌——不固定同一家。</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>各來源 ROAS(近 {WINDOW_DAYS} 天平均)</CardTitle></CardHeader>
              <CardContent>
                <RoasChart bySource={summary.by_source} />
                <p className="mt-2 text-xs text-muted-foreground">平均後各來源有明顯差距(spread);每日洗牌見上圖。</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>預算分配</CardTitle></CardHeader>
              <CardContent><BudgetPie bySource={summary.by_source} /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI 月度策略建議 · 近 30 天</CardTitle>
              <CardDescription>
                {insights?.data_date ? `資料截至 ${insights.data_date}` : '資料截至最新同步'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-1">
                <div className="text-sm font-medium">各來源 ROAS / CPA</div>
                <StrategyKpiChart bySource={strategySummary?.by_source ?? []} />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium">預算效率落差(誰該加、誰該減)</div>
                <EfficiencyGapChart metrics={insights?.metrics ?? []} />
              </div>
              <InsightCard insights={insights} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
    </TooltipProvider>
  )
}
