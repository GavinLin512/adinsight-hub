import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getEtlRuns } from '@/api'
import type { EtlRun, RunStatus } from '@/types'

const RUN_BADGE: Record<RunStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: '全部成功', variant: 'success' },
  partial: { label: '部分失敗', variant: 'warning' },
  failed: { label: '全部失敗', variant: 'destructive' },
}

function insightLabel(status?: string): { text: string; cls: string } {
  if (status === 'ok') return { text: '成功', cls: 'text-emerald-600' }
  if (status === 'skipped') return { text: '略過(無資料變更)', cls: 'text-muted-foreground' }
  return { text: '失敗', cls: 'text-destructive' }
}

export default function AdminLogs() {
  const [runs, setRuns] = useState<EtlRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRuns(await getEtlRuns())
    } catch {
      setError('無法載入執行紀錄,請確認後端已啟動。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-primary">OPERATIONS</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">ETL 執行紀錄</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>重新整理</Button>
          <Button variant="outline" asChild><Link to="/admin">← 返回後台</Link></Button>
        </div>
      </div>

      {error && <Card><CardContent className="p-4 text-destructive">{error}</CardContent></Card>}
      {loading && <p className="text-muted-foreground">載入中…</p>}
      {!loading && runs.length === 0 && !error && (
        <Card><CardContent className="p-6 text-muted-foreground">尚無執行紀錄,請先執行一次 ETL。</CardContent></Card>
      )}

      {runs.map((run) => {
        const badge = RUN_BADGE[run.status] ?? RUN_BADGE.partial
        const sources = run.summary?.sources || {}
        const ins = insightLabel(run.summary?.insights_status)
        return (
          <Card key={run.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-3 text-base">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </span>
                <span className="text-xs font-normal text-muted-foreground">batch: {run.batch_id.slice(0, 8)}…</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="divide-y">
                {Object.entries(sources).map(([src, info]) => (
                  <li key={src} className="flex items-baseline gap-3 py-2">
                    <Badge variant={info.status === 'ok' ? 'success' : 'destructive'} className="shrink-0">
                      {src} · {info.status === 'ok' ? '成功' : '失敗'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {info.status === 'ok' ? `擷取 ${info.extracted} 筆` : `錯誤:${info.error}`}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-5 text-sm text-muted-foreground">
                <span>upsert {run.summary?.unified_upserted ?? 0} 筆</span>
                <span>AI 洞察:<b className={ins.cls}>{ins.text}</b></span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
