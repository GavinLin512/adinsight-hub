import { Badge } from '@/components/ui/badge'
import type { InsightOut } from '@/types'

const ACTION_VARIANT: Record<string, 'success' | 'destructive' | 'secondary'> = {
  加: 'success',
  減: 'destructive',
  維持: 'secondary',
}

export default function InsightCard({ insights }: { insights: InsightOut | null }) {
  if (!insights) return <p className="text-sm text-muted-foreground">尚無 AI 洞察</p>

  const hasItems = insights.items && insights.items.length > 0
  if (insights.error && !hasItems && !insights.raw_text) {
    return <p className="whitespace-pre-line text-sm text-muted-foreground">AI 洞察暫時無法取得:{insights.error}</p>
  }

  return (
    <div className="space-y-3">
      {insights.error && <p className="whitespace-pre-line text-xs text-amber-600">注意:{insights.error}</p>}
      {insights.summary && (
        <div className="rounded-lg border-l-4 border-primary bg-card p-4 shadow-sm">
          <div className="mb-1 text-xs font-semibold tracking-wide text-primary">整體建議</div>
          <p className="max-w-prose text-sm leading-relaxed">{insights.summary}</p>
        </div>
      )}
      {insights.raw_text && (
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{insights.raw_text}</pre>
      )}
      <ul className="divide-y">
        {(insights.items || []).map((item, i) => (
          <li key={i} className="flex items-baseline gap-3 py-2.5">
            <Badge variant={ACTION_VARIANT[item.action] ?? 'secondary'} className="shrink-0">
              {item.source} · {item.action}
            </Badge>
            <span className="text-sm leading-relaxed">{item.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
