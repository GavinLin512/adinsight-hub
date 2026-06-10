import axios from 'axios'
import type {
  AnalyticsSummary, EtlRun, EtlSummary, InsightOut, RawOverview, SourceTimeseriesPoint, TimeseriesPoint,
} from '@/types'

// 瀏覽器在 host 端發出請求,故預設打 localhost:8000(後端對外埠)
const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const client = axios.create({ baseURL, timeout: 120000 })

// endDate:檢視截止日;days:只看最新資料日往回 N 天(與趨勢圖對齊)
export const getSummary = (endDate?: string | null, days?: number) => {
  const params: Record<string, string | number> = {}
  if (endDate) params.end_date = endDate
  if (days) params.days = days
  return client.get<AnalyticsSummary>('/analytics/summary', { params }).then((r) => r.data)
}

export const getTimeseries = (endDate?: string | null) =>
  client
    .get<TimeseriesPoint[]>('/analytics/timeseries', { params: endDate ? { end_date: endDate } : {} })
    .then((r) => r.data)

export const getTimeseriesBySource = (endDate?: string | null) =>
  client
    .get<SourceTimeseriesPoint[]>('/analytics/timeseries-by-source', { params: endDate ? { end_date: endDate } : {} })
    .then((r) => r.data)

export const getInsights = () => client.get<InsightOut>('/insights').then((r) => r.data)

export const getRawOverview = () => client.get<RawOverview>('/raw/overview').then((r) => r.data)

export const getEtlRuns = () => client.get<EtlRun[]>('/etl/runs').then((r) => r.data)

// failSources:模擬失敗來源(D6);asOf:'YYYY-MM-DD' 指定資料日期(mock 視窗錨點)
export const runEtl = (failSources: string[] = [], asOf?: string | null) => {
  const params: Record<string, string> = {}
  if (failSources.length) params.fail = failSources.join(',')
  if (asOf) params.as_of = asOf
  return client.post<EtlSummary>('/etl/run', null, { params }).then((r) => r.data)
}

// 清除所有累積資料(保留 schema 與 mock 產生器)
export const resetData = () =>
  client.post<{ status: string; message: string }>('/admin/reset-data').then((r) => r.data)
