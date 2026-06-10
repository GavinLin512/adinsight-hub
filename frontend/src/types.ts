// 後端 API 回應型別(對應 backend/app/schemas.py 與端點)

export interface KpiBlock {
  impressions: number
  clicks: number
  cost_twd: number
  conversions: number
  revenue_twd: number
  roas: number | null
  cpa: number | null
  ctr: number | null
  budget_share: number | null
}

export interface SourceKpi extends KpiBlock {
  source: string
}

export interface AnalyticsSummary {
  overall: KpiBlock
  by_source: SourceKpi[]
}

export interface TimeseriesPoint {
  date: string
  cost_twd: number
  revenue_twd: number
  roas: number | null
  conversions: number
}

export interface SourceTimeseriesPoint {
  date: string
  source: string
  cost_twd: number
  revenue_twd: number
  roas: number | null
}

export interface InsightItem {
  source: string
  action: string
  reason: string
}

export interface InsightOut {
  generated_at: string | null
  data_date: string | null // 洞察彙總視窗的資料錨點(max unified.date)
  items: InsightItem[]
  raw_text: string | null
  error: string | null
}

export type SourceStatus = 'ok' | 'failed'

export interface SourceRunInfo {
  status: SourceStatus
  extracted?: number
  error?: string
}

export type RunStatus = 'ok' | 'partial' | 'failed'

export interface EtlSummary {
  batch_id: string
  as_of: string | null
  sources: Record<string, SourceRunInfo>
  transformed_rows: number
  unified_upserted: number
  insights_status?: 'ok' | 'error' | 'skipped'
  run_status?: RunStatus
}

export interface EtlRun {
  id: number
  batch_id: string
  status: RunStatus
  summary: EtlSummary
  created_at: string
}

export type SourceKey = 'google' | 'meta' | 'ga4'

export interface RawOverview {
  sample: Record<SourceKey, Record<string, unknown> | null>
  raw_stats: { total_rows: number; batch_count: number; by_source: Record<string, number> }
  unified_stats: { total_rows: number; date_min: string | null; date_max: string | null }
}
