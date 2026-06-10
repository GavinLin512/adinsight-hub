import { Badge } from '@/components/ui/badge'
import type { InsightOut } from '@/types'

const ACTION_VARIANT: Record<string, 'success' | 'destructive' | 'secondary'> = {
  加: 'success',
  減: 'destructive',
  維持: 'secondary',
}

const ACTION_LABEL: Record<string, string> = {
  加: '增加預算',
  減: '減少預算',
  維持: '維持預算',
}

type Props = {
  insights: InsightOut | null
  // 'summary' 只渲染整體建議(放圖表上方);'details' 渲染逐條建議(放圖表下方);省略則全渲染
  section?: 'summary' | 'details'
}

export default function InsightCard({ insights, section }: Props) {
  const showSummary = section !== 'details'
  const showDetails = section !== 'summary'

  if (!insights) {
    return showDetails ? <p className="text-sm text-muted-foreground">尚無 AI 洞察</p> : null
  }

  const hasItems = insights.items && insights.items.length > 0
  if (insights.error && !hasItems && !insights.raw_text) {
    return showDetails
      ? <p className="whitespace-pre-line text-sm text-muted-foreground">AI 洞察暫時無法取得:{insights.error}</p>
      : null
  }

  return (
    <div className="space-y-3">
      {showSummary && insights.error && (
        <p className="whitespace-pre-line text-xs text-amber-600">注意:{insights.error}</p>
      )}
      {showSummary && insights.summary && (
        <div className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <div className="mb-1 text-xs font-semibold tracking-wide text-primary">整體建議</div>
          <p className="max-w-prose text-sm leading-relaxed">{insights.summary}</p>
        </div>
      )}
      {showDetails && insights.raw_text && (
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{insights.raw_text}</pre>
      )}
      {showDetails && hasItems && (
        <div className="space-y-1">
          <div className="text-sm font-medium">各來源建議</div>
          <ul className="divide-y">
            {(insights.items || []).map((item, i) => (
              <li key={i} className="flex items-baseline gap-3 py-2.5">
                <Badge variant={ACTION_VARIANT[item.action] ?? 'secondary'} className="shrink-0">
                  {item.source} · {ACTION_LABEL[item.action] ?? item.action}
                </Badge>
                <span className="text-sm leading-relaxed">{item.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
