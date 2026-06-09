// 資料孤島 → 統一:展示三來源不一致的原始欄位,如何對應到同一組統一欄位。
// 並以統計列呈現 raw(append-only,重跑會漲)vs unified(upsert,冪等不漲)。

// 統一欄位 → 各來源原始欄位名的對應(刻意不一致)
const FIELD_MAP = [
  { unified: 'campaign_name', google: 'campaign', meta: 'ad_set_name', ga4: 'session_campaign' },
  { unified: 'date', google: 'day', meta: 'date', ga4: 'event_date' },
  { unified: 'impressions', google: 'impressions', meta: 'impressions', ga4: 'ad_impressions' },
  { unified: 'clicks', google: 'clicks', meta: 'link_clicks', ga4: 'ad_clicks' },
  { unified: 'cost_twd', google: 'cost', meta: 'spend', ga4: 'ad_cost' },
  { unified: 'conversions', google: 'conversions', meta: 'results', ga4: 'conversions' },
  { unified: 'revenue_twd', google: 'conv_value', meta: 'revenue', ga4: 'total_revenue' },
]

const SOURCE_META = {
  google: { label: 'Google Ads', note: 'TWD · YYYY-MM-DD' },
  meta: { label: 'Meta', note: 'USD · DD/MM/YYYY' },
  ga4: { label: 'GA4', note: 'TWD · YYYYMMDD' },
}

function Cell({ field, payload, usd }) {
  if (!payload || payload[field] === undefined) return <span className="muted">—</span>
  return (
    <span>
      <code>{field}</code>
      <span className="cell-val">{String(payload[field])}{usd ? ' (USD)' : ''}</span>
    </span>
  )
}

export default function RawUnifiedPanel({ data }) {
  if (!data) return <p className="empty">尚無資料,請先執行 ETL</p>
  const { sample, raw_stats: raw, unified_stats: uni } = data

  return (
    <div>
      <p className="hint">
        三個來源的欄位名、日期格式、幣別刻意不同(資料孤島)。Pandas 清洗後對應到同一組統一欄位。
      </p>

      <div className="map-table-wrap">
        <table className="map-table">
          <thead>
            <tr>
              <th>統一欄位</th>
              {['google', 'meta', 'ga4'].map((s) => (
                <th key={s}>{SOURCE_META[s].label}<div className="th-note">{SOURCE_META[s].note}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELD_MAP.map((row) => (
              <tr key={row.unified}>
                <td className="unified-col"><b>{row.unified}</b></td>
                <td><Cell field={row.google} payload={sample.google} /></td>
                <td>
                  <Cell
                    field={row.meta}
                    payload={sample.meta}
                    usd={row.unified === 'cost_twd' || row.unified === 'revenue_twd'}
                  />
                </td>
                <td><Cell field={row.ga4} payload={sample.ga4} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stats-strip">
        <div className="stat-block">
          <div className="stat-title">raw_campaigns(append-only)</div>
          <div className="stat-nums">
            <span><b>{raw.total_rows.toLocaleString()}</b> 筆</span>
            <span><b>{raw.batch_count}</b> 批次</span>
          </div>
          <div className="stat-sub">重跑會持續增加(保留每次擷取歷史)</div>
        </div>
        <div className="stat-arrow">→ 清洗 / 統一 / 冪等 upsert →</div>
        <div className="stat-block">
          <div className="stat-title">unified_campaigns(upsert)</div>
          <div className="stat-nums">
            <span><b>{uni.total_rows.toLocaleString()}</b> 筆</span>
            <span>{uni.date_min} ~ {uni.date_max}</span>
          </div>
          <div className="stat-sub">重跑筆數不變(唯一鍵冪等)</div>
        </div>
      </div>
    </div>
  )
}
