import axios from 'axios'
import type { AnalyticsSummary, EtlRun, EtlSummary, InsightOut, RawOverview, TimeseriesPoint } from '@/types'

// 瀏覽器在 host 端發出請求,故預設打 localhost:8000(後端對外埠)
const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const client = axios.create({ baseURL, timeout: 120000 })

// endDate:'YYYY-MM-DD' → 只看該日(含)以前的資料(檢視截止日)
export const getSummary = (endDate?: string | null) =>
  client
    .get<AnalyticsSummary>('/analytics/summary', { params: endDate ? { end_date: endDate } : {} })
    .then((r) => r.data)

export const getTimeseries = (endDate?: string | null) =>
  client
    .get<TimeseriesPoint[]>('/analytics/timeseries', { params: endDate ? { end_date: endDate } : {} })
    .then((r) => r.data)

export const getInsights = () => client.get<InsightOut>('/insights').then((r) => r.data)

export const getRawOverview = () => client.get<RawOverview>('/raw/overview').then((r) => r.data)

export const getEtlRuns = () => client.get<EtlRun[]>('/etl/runs').then((r) => r.data)

// failSources:陣列,如 ['meta'] → 模擬該來源失敗(D6 容錯測試)
export const runEtl = (failSources: string[] = []) => {
  const params: Record<string, string> = {}
  if (failSources.length) params.fail = failSources.join(',')
  return client.post<EtlSummary>('/etl/run', null, { params }).then((r) => r.data)
}

// 清除所有累積資料(保留 schema 與 mock 產生器)
export const resetData = () =>
  client.post<{ status: string; message: string }>('/admin/reset-data').then((r) => r.data)
