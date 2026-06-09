import axios from 'axios'

// 瀏覽器在 host 端發出請求,故預設打 localhost:8000(後端對外埠)
const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const client = axios.create({ baseURL, timeout: 120000 })

// endDate:'YYYY-MM-DD' → 只看該日(含)以前的資料(檢視截止日)
export const getSummary = (endDate = null) =>
  client.get('/analytics/summary', { params: endDate ? { end_date: endDate } : {} }).then((r) => r.data)
export const getTimeseries = (endDate = null) =>
  client.get('/analytics/timeseries', { params: endDate ? { end_date: endDate } : {} }).then((r) => r.data)
export const getInsights = () => client.get('/insights').then((r) => r.data)
export const getRawOverview = () => client.get('/raw/overview').then((r) => r.data)

// failSources:陣列,如 ['meta'] → 模擬該來源失敗(D6 容錯測試)
// asOf:'YYYY-MM-DD' → demo 用資料截止日(mock 視窗錨點)
export const runEtl = (failSources = [], asOf = null) => {
  const params = {}
  if (failSources.length) params.fail = failSources.join(',')
  if (asOf) params.as_of = asOf
  return client.post('/etl/run', null, { params }).then((r) => r.data)
}

export const getEtlRuns = () => client.get('/etl/runs').then((r) => r.data)
