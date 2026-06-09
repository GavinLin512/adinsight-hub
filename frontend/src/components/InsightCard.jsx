const ACTION_STYLE = {
  加: { bg: '#e6f4ea', fg: '#137333' },
  減: { bg: '#fce8e6', fg: '#c5221f' },
  維持: { bg: '#e8eaed', fg: '#5f6368' },
}

export default function InsightCard({ insights }) {
  if (!insights) {
    return <p className="empty">尚無 AI 洞察</p>
  }
  if (insights.error && (!insights.items || insights.items.length === 0) && !insights.raw_text) {
    return <p className="empty">AI 洞察暫時無法取得:{insights.error}</p>
  }

  return (
    <div>
      {insights.error && <p className="warn">注意:{insights.error}</p>}
      {insights.raw_text && <pre className="raw">{insights.raw_text}</pre>}
      <ul className="insight-list">
        {(insights.items || []).map((item, i) => {
          const style = ACTION_STYLE[item.action] || ACTION_STYLE['維持']
          return (
            <li key={i} className="insight-item">
              <span className="badge" style={{ background: style.bg, color: style.fg }}>
                {item.source} · {item.action}
              </span>
              <span className="reason">{item.reason}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
