import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { RawOverview, SourceKey } from '@/types'

interface FieldMapRow {
  unified: string
  zh: string
  google: string
  meta: string
  ga4: string
}

// 統一欄位 → 各來源原始欄位名(刻意不一致);zh 為該欄位中文意思
const FIELD_MAP: FieldMapRow[] = [
  { unified: 'campaign_name', zh: '活動名稱', google: 'campaign', meta: 'ad_set_name', ga4: 'session_campaign' },
  { unified: 'date', zh: '日期', google: 'day', meta: 'date', ga4: 'event_date' },
  { unified: 'impressions', zh: '曝光數', google: 'impressions', meta: 'impressions', ga4: 'ad_impressions' },
  { unified: 'clicks', zh: '點擊數', google: 'clicks', meta: 'link_clicks', ga4: 'ad_clicks' },
  { unified: 'cost_twd', zh: '花費(新台幣)', google: 'cost', meta: 'spend', ga4: 'ad_cost' },
  { unified: 'conversions', zh: '轉換數', google: 'conversions', meta: 'results', ga4: 'conversions' },
  { unified: 'revenue_twd', zh: '營收(新台幣)', google: 'conv_value', meta: 'revenue', ga4: 'total_revenue' },
]

const SOURCE_META: Record<SourceKey, { label: string; note: string }> = {
  google: { label: 'Google Ads', note: 'TWD · YYYY-MM-DD' },
  meta: { label: 'Meta', note: 'USD · DD/MM/YYYY' },
  ga4: { label: 'GA4', note: 'TWD · YYYYMMDD' },
}

function Cell({ field, payload, usd }: { field: string; payload: Record<string, unknown> | null; usd?: boolean }) {
  if (!payload || payload[field] === undefined) return <span className="text-muted-foreground/40">—</span>
  return (
    <span className="block">
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-destructive">{field}</code>
      <span className="mt-1 block text-xs text-muted-foreground">
        {String(payload[field])}{usd ? ' (USD)' : ''}
      </span>
    </span>
  )
}

function Stat({ title, nums, sub }: { title: string; nums: ReactNode; sub: string }) {
  return (
    <div className="flex-1 rounded-lg bg-muted/50 p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="my-1.5 flex gap-4 text-sm">{nums}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

export default function RawUnifiedPanel({ data }: { data: RawOverview | null }) {
  if (!data) return <p className="text-sm text-muted-foreground">尚無資料,請先執行 ETL</p>
  const { sample, raw_stats: raw, unified_stats: uni } = data

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        三來源的欄位名、日期格式、幣別刻意不同(資料孤島)。Pandas 清洗後對應到同一組統一欄位。
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>統一欄位</TableHead>
            {(['google', 'meta', 'ga4'] as SourceKey[]).map((s) => (
              <TableHead key={s}>
                {SOURCE_META[s].label}
                <div className="text-[11px] font-normal text-muted-foreground">{SOURCE_META[s].note}</div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {FIELD_MAP.map((row) => (
            <TableRow key={row.unified}>
              <TableCell className="whitespace-nowrap bg-muted/30 font-medium">
                {row.unified}
                <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{row.zh}</span>
              </TableCell>
              <TableCell><Cell field={row.google} payload={sample.google} /></TableCell>
              <TableCell>
                <Cell
                  field={row.meta}
                  payload={sample.meta}
                  usd={row.unified === 'cost_twd' || row.unified === 'revenue_twd'}
                />
              </TableCell>
              <TableCell><Cell field={row.ga4} payload={sample.ga4} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center gap-4">
        <Stat
          title="raw_campaigns(append-only)"
          nums={
            <>
              <span><b className="text-lg text-primary">{raw.total_rows.toLocaleString()}</b> 筆</span>
              <span><b className="text-lg text-primary">{raw.batch_count}</b> 批次</span>
            </>
          }
          sub="重跑會持續增加(保留每次擷取歷史)"
        />
        <div className="whitespace-nowrap text-sm text-muted-foreground">→ 清洗 / 統一 / 冪等 upsert →</div>
        <Stat
          title="unified_campaigns(upsert)"
          nums={
            <>
              <span><b className="text-lg text-primary">{uni.total_rows.toLocaleString()}</b> 筆</span>
              <span className="text-muted-foreground">{uni.date_min} ~ {uni.date_max}</span>
            </>
          }
          sub="重跑筆數不變(唯一鍵冪等)"
        />
      </div>
    </div>
  )
}
