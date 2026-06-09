import { useEffect, useState } from 'react'
import { getEtlRuns, getInsights, getRawOverview, getSummary, getTimeseries, runEtl } from './api'
import BudgetPie from './components/BudgetPie'
import InsightCard from './components/InsightCard'
import LogsPage from './components/LogsPage'
import RawUnifiedPanel from './components/RawUnifiedPanel'
import RoasChart from './components/RoasChart'
import TrendChart from './components/TrendChart'
import './styles.css'

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// 隨機挑 1~3 個來源失敗(使用者不指定)
function pickRandomFailures() {
  const sources = ['google', 'meta', 'ga4']
  const count = 1 + Math.floor(Math.random() * sources.length) // 1..3
  return [...sources].sort(() => Math.random() - 0.5).slice(0, count)
}

// 最近 n 天的本地日期(避免 UTC 偏移),供 demo 資料截止日選單
function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function lastNDates(n) {
  const out = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = fmtDate(d)
    out.push({ iso, label: i === 0 ? `今天 (${iso})` : `${i} 天前 (${iso})` })
  }
  return out
}
const DEMO_DATES = lastNDates(7)

export default function App() {
  const route = useHashRoute()
  if (route === '#/logs') {
    return <LogsPage />
  }
  return <Dashboard />
}

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [timeseries, setTimeseries] = useState([])
  const [insights, setInsights] = useState(null)
  const [rawOverview, setRawOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [latestRun, setLatestRun] = useState(null)
  const [viewDate, setViewDate] = useState(DEMO_DATES[0].iso) // 檢視截止日(預設今天=看全部)

  async function load(endDate = viewDate) {
    setLoading(true)
    setError(null)
    try {
      const [s, ts, i, runs, raw] = await Promise.all([
        getSummary(endDate), getTimeseries(endDate), getInsights(), getEtlRuns(), getRawOverview(),
      ])
      setSummary(s)
      setTimeseries(ts)
      setInsights(i)
      setLatestRun(runs[0] || null)  // 最近一次執行(後端持久化,重整也在)
      setRawOverview(raw)
    } catch (e) {
      setError('無法連到後端 API,請確認後端已啟動。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function handleViewDateChange(newDate) {
    setViewDate(newDate)
    load(newDate)  // 切換檢視截止日 → 立即重抓,圖表隨之變化
  }

  async function handleRunEtl(failSources = [], runAsOf = null) {
    setRunning(true)
    setError(null)
    try {
      await runEtl(failSources, runAsOf)
      await load()
    } catch (e) {
      setError('ETL 執行失敗。')
    } finally {
      setRunning(false)
    }
  }

  const overall = summary?.overall
  const hasData = overall && overall.cost_twd > 0

  return (
    <div className="app">
      <header className="header">
        <h1>AdInsight Hub</h1>
        <button onClick={() => handleRunEtl([])} disabled={running}>
          {running ? '執行中…' : '執行 ETL'}
        </button>
      </header>

      {/* 容錯測試(D6):隨機讓 1~3 個來源失敗,使用者不指定 */}
      <section className="panel test-panel">
        <h2>容錯測試</h2>
        <p className="hint">隨機讓一至三個來源擷取失敗,觀察其餘來源是否仍正常完成。每次結果不同。</p>
        <div className="test-row">
          <button className="danger" onClick={() => handleRunEtl(pickRandomFailures())} disabled={running}>
            隨機模擬來源失敗並執行 ETL
          </button>
        </div>
      </section>

      {/* 檢視截止日:過濾「此日(含)以前」的資料。前推日期 → 總額與趨勢圖逐步增加 */}
      <section className="panel test-panel">
        <h2>檢視截止日</h2>
        <p className="hint">
          只顯示所選日期(含)以前的資料。往今天方向前推,總花費與趨勢圖會逐步增加。
        </p>
        <div className="test-row">
          <select value={viewDate} onChange={(e) => handleViewDateChange(e.target.value)} disabled={loading}>
            {DEMO_DATES.map((d) => (
              <option key={d.iso} value={d.iso}>{d.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 最後同步狀態:反映本次各來源成敗,圖表為累積資料(失敗來源沿用歷史資料) */}
      {latestRun && <SyncStatus run={latestRun} />}

      {error && <div className="banner error">{error}</div>}
      {loading && <p>載入中…</p>}

      {!loading && !hasData && !error && (
        <div className="banner">尚無資料,請按右上角「執行 ETL」產生資料。</div>
      )}

      {!loading && hasData && (
        <>
          <Panel title="資料孤島 → 統一(raw vs unified)">
            <RawUnifiedPanel data={rawOverview} />
          </Panel>

          <section className="kpis">
            <Kpi label="總花費 (TWD)" value={`NT$${Math.round(overall.cost_twd).toLocaleString()}`} />
            <Kpi label="整體 ROAS" value={overall.roas != null ? `${overall.roas}x` : '—'} />
            <Kpi label="整體 CPA" value={overall.cpa != null ? `NT$${overall.cpa}` : '—'} />
            <Kpi label="整體 CTR" value={overall.ctr != null ? `${(overall.ctr * 100).toFixed(2)}%` : '—'} />
          </section>

          <Panel title="每日花費 / 收入趨勢(最近 14 天)">
            <TrendChart data={timeseries} />
            <p className="hint">切換上方「檢視截止日」,這張趨勢圖會隨日期即時變化。</p>
          </Panel>

          <div className="grid">
            <Panel title="各來源 ROAS">
              <RoasChart bySource={summary.by_source} />
              <p className="hint">ROAS 為比例,加入更多相似日子比例幾乎不變,屬正常。</p>
            </Panel>
            <Panel title="預算分配">
              <BudgetPie bySource={summary.by_source} />
            </Panel>
          </div>

          <Panel title="AI 行銷洞察">
            <InsightCard insights={insights} />
          </Panel>
        </>
      )}

      <footer className="footer">
        <a href="#/logs" className="link-btn">查看 ETL 執行紀錄(成功/失敗訊息)→</a>
      </footer>
    </div>
  )
}

const RUN_BADGE = {
  ok: { label: '全部成功', bg: '#e6f4ea', fg: '#137333' },
  partial: { label: '部分失敗', bg: '#fef7e0', fg: '#b06000' },
  failed: { label: '全部失敗', bg: '#fce8e6', fg: '#c5221f' },
}

const INSIGHT_LABEL = {
  ok: { text: '成功', color: '#137333' },
  error: { text: '失敗', color: '#c5221f' },
  skipped: { text: '略過(無資料變更)', color: '#5f6368' },
}

function SyncStatus({ run }) {
  const s = run.summary || {}
  const badge = RUN_BADGE[run.status] || RUN_BADGE.partial
  const insight = INSIGHT_LABEL[s.insights_status] || INSIGHT_LABEL.skipped
  return (
    <section className="panel sync-status">
      <div className="run-head">
        <h2 style={{ margin: 0 }}>最後同步狀態</h2>
        <span className="badge" style={{ background: badge.bg, color: badge.fg }}>{badge.label}</span>
        <span className="run-time">{new Date(run.created_at).toLocaleString()}</span>
        {s.as_of && <span className="run-batch">資料截止日:{s.as_of}</span>}
      </div>
      <div className="test-result">
        {Object.entries(s.sources || {}).map(([src, info]) => (
          <span key={src} className="src-pill" style={{ color: info.status === 'ok' ? '#137333' : '#c5221f' }}>
            {src}:{info.status === 'ok' ? '成功' : '失敗'}
          </span>
        ))}
        <span className="src-pill">AI 洞察:<b style={{ color: insight.color }}>{insight.text}</b></span>
      </div>
      {run.status !== 'ok' && (
        <p className="hint">
          註:圖表為累積資料,失敗來源沿用先前成功同步的歷史資料(upsert 不刪資料)。
        </p>
      )}
    </section>
  )
}

function Kpi({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
