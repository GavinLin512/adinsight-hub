import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DatePicker from '@/components/DatePicker'
import RawUnifiedPanel from '@/components/RawUnifiedPanel'
import SyncStatus from '@/components/SyncStatus'
import { getEtlRuns, getRawOverview, resetData, runEtl } from '@/api'
import { fmtDate } from '@/lib/dates'
import type { EtlRun, RawOverview } from '@/types'

// 隨機挑 1~3 個來源失敗(使用者不指定)
function pickRandomFailures(): string[] {
  const sources = ['google', 'meta', 'ga4']
  const count = 1 + Math.floor(Math.random() * sources.length)
  return [...sources].sort(() => Math.random() - 0.5).slice(0, count)
}

export default function AdminConsole() {
  const [latestRun, setLatestRun] = useState<EtlRun | null>(null)
  const [rawOverview, setRawOverview] = useState<RawOverview | null>(null)
  const [running, setRunning] = useState(false)
  const [runDate, setRunDate] = useState(fmtDate(new Date())) // 資料日期(預設今天)

  async function load() {
    try {
      const [runs, raw] = await Promise.all([getEtlRuns(), getRawOverview()])
      setLatestRun(runs[0] ?? null)
      setRawOverview(raw)
    } catch {
      toast.error('無法載入後台資料,請確認後端已啟動。')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleRun(failSources: string[] = []) {
    setRunning(true)
    const bc = new BroadcastChannel('adinsight-etl')
    // localStorage 為持久狀態(供前台掛載時補讀),BroadcastChannel 為即時轉換
    localStorage.setItem('adinsight-etl', JSON.stringify({ status: 'running', ts: Date.now() }))
    bc.postMessage({ type: 'etl_started' })
    try {
      const result = await runEtl(failSources, runDate)
      const failed = Object.entries(result.sources || {})
        .filter(([, v]) => v.status === 'failed')
        .map(([s]) => s)
      const tag = `資料日期 ${runDate}`
      if (failed.length) toast.warning(`ETL 完成(${result.run_status},${tag}):失敗來源 ${failed.join(', ')}`)
      else toast.success(`ETL 完成(${tag}):全部來源成功`)
      await load()
    } catch {
      toast.error('ETL 執行失敗。')
    } finally {
      setRunning(false)
      localStorage.setItem('adinsight-etl', JSON.stringify({ status: 'idle', ts: Date.now() }))
      bc.postMessage({ type: 'etl_done' })
      bc.close()
    }
  }

  async function handleReset() {
    setRunning(true)
    try {
      await resetData()
      toast.success('已清除所有資料')
      await load()
    } catch {
      toast.error('清除資料失敗。')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary">OPERATIONS</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">後台控制台</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ETL 操作</CardTitle>
          <CardDescription>
            指定「資料日期」執行同步——選不同日期可 demo 不同日期資料不同。亦可隨機模擬來源失敗測試容錯。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            資料同步日(as-of)
            <DatePicker value={runDate} onChange={setRunDate} max={fmtDate(new Date())} disabled={running} />
          </div>
          <Button onClick={() => handleRun([])} disabled={running}>
            {running ? '執行中…' : '以此日期執行 ETL'}
          </Button>
          <Button variant="destructive" onClick={() => handleRun(pickRandomFailures())} disabled={running}>
            隨機模擬來源失敗並執行
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={running}>清除所有資料</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>確定清除所有資料?</AlertDialogTitle>
                <AlertDialogDescription>
                  將清空 raw / unified / 洞察 / 執行紀錄(保留資料表結構與 mock 產生器)。
                  此動作無法復原,但可再按「執行 ETL」重新產生資料。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>確定清除</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="yellow" asChild>
            <Link to="/admin/logs">查看完整 ETL 執行紀錄 →</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>最後同步狀態</CardTitle></CardHeader>
        <CardContent><SyncStatus run={latestRun} /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>資料孤島 → 統一(raw vs unified)</CardTitle>
          <CardDescription>三來源格式差異與兩層設計(append-only vs 冪等)統計。</CardDescription>
        </CardHeader>
        <CardContent><RawUnifiedPanel data={rawOverview} /></CardContent>
      </Card>

    </div>
  )
}
