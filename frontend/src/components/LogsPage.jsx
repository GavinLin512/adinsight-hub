import { useEffect, useState } from 'react'
import { getEtlRuns } from '../api'

const RUN_STATUS = {
  ok: { label: '全部成功', bg: '#e6f4ea', fg: '#137333' },
  partial: { label: '部分失敗', bg: '#fef7e0', fg: '#b06000' },
  failed: { label: '全部失敗', bg: '#fce8e6', fg: '#c5221f' },
}

const SRC_OK = { bg: '#e6f4ea', fg: '#137333' }
const SRC_FAIL = { bg: '#fce8e6', fg: '#c5221f' }

export default function LogsPage() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setRuns(await getEtlRuns())
    } catch (e) {
      setError('無法載入執行紀錄,請確認後端已啟動。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>ETL 執行紀錄</h1>
        <div>
          <button className="secondary" onClick={load} disabled={loading}>重新整理</button>
          <a href="#/" className="link-btn">← 返回 Dashboard</a>
        </div>
      </header>

      {error && <div className="banner error">{error}</div>}
      {loading && <p>載入中…</p>}
      {!loading && runs.length === 0 && !error && (
        <div className="banner">尚無執行紀錄,請先在 Dashboard 執行一次 ETL。</div>
      )}

      {runs.map((run) => {
        const meta = RUN_STATUS[run.status] || RUN_STATUS.partial
        const sources = run.summary?.sources || {}
        const insightsStatus = run.summary?.insights_status
        return (
          <section className="panel" key={run.id}>
            <div className="run-head">
              <span className="badge" style={{ background: meta.bg, color: meta.fg }}>
                {meta.label}
              </span>
              <span className="run-time">{new Date(run.created_at).toLocaleString()}</span>
              <span className="run-batch">batch: {run.batch_id.slice(0, 8)}…</span>
            </div>

            <ul className="insight-list">
              {Object.entries(sources).map(([src, info]) => {
                const ok = info.status === 'ok'
                const style = ok ? SRC_OK : SRC_FAIL
                return (
                  <li key={src} className="insight-item">
                    <span className="badge" style={{ background: style.bg, color: style.fg }}>
                      {src} · {ok ? '成功' : '失敗'}
                    </span>
                    <span className="reason">
                      {ok ? `擷取 ${info.extracted} 筆` : `錯誤:${info.error}`}
                    </span>
                  </li>
                )
              })}
            </ul>

            <div className="run-foot">
              <span>upsert {run.summary?.unified_upserted ?? 0} 筆</span>
              <span>
                AI 洞察:
                <b style={{ color: insightsStatus === 'ok' ? '#137333' : insightsStatus === 'skipped' ? '#5f6368' : '#c5221f' }}>
                  {insightsStatus === 'ok' ? '成功' : insightsStatus === 'skipped' ? '略過(無資料變更)' : '失敗'}
                </b>
              </span>
            </div>
          </section>
        )
      })}
    </div>
  )
}
