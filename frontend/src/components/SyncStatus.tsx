import { Badge } from '@/components/ui/badge'
import type { EtlRun, RunStatus } from '@/types'

const RUN_BADGE: Record<RunStatus, { label: string; variant: 'success' | 'warning' | 'destructive' }> = {
  ok: { label: '全部成功', variant: 'success' },
  partial: { label: '部分失敗', variant: 'warning' },
  failed: { label: '全部失敗', variant: 'destructive' },
}

const INSIGHT_LABEL: Record<string, { text: string; cls: string }> = {
  ok: { text: '成功', cls: 'text-emerald-600' },
  error: { text: '失敗', cls: 'text-destructive' },
  skipped: { text: '略過(無資料變更)', cls: 'text-muted-foreground' },
}

export default function SyncStatus({ run }: { run: EtlRun | null }) {
  if (!run) return <p className="text-sm text-muted-foreground">尚無執行紀錄</p>
  const s = run.summary || {}
  const badge = RUN_BADGE[run.status] ?? RUN_BADGE.partial
  const insight = INSIGHT_LABEL[s.insights_status ?? 'skipped'] ?? INSIGHT_LABEL.skipped

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="text-xs text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
        {s.as_of && <span className="text-xs text-muted-foreground">資料截止日:{s.as_of}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {Object.entries(s.sources || {}).map(([src, info]) => (
          <span key={src} className={info.status === 'ok' ? 'text-emerald-600' : 'text-destructive'}>
            {src}:{info.status === 'ok' ? '成功' : '失敗'}
          </span>
        ))}
        <span>AI 洞察:<b className={insight.cls}>{insight.text}</b></span>
      </div>
      {run.status !== 'ok' && (
        <p className="text-xs text-muted-foreground">
          註:圖表為累積資料,失敗來源沿用先前成功同步的歷史資料(upsert 不刪資料)。
        </p>
      )}
    </div>
  )
}
