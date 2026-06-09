import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'

// 顯示最近 N 天每日花費 / 收入趨勢。日期不同數值不同,改變資料截止日時這張圖會明顯變化。
export default function TrendChart({ data, days = 14 }) {
  const series = (data || []).slice(-days).map((d) => ({
    date: d.date.slice(5), // MM-DD
    花費: Math.round(d.cost_twd),
    收入: Math.round(d.revenue_twd),
  }))

  if (series.length === 0) {
    return <p className="empty">尚無趨勢資料</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={series} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v) => `NT$${v.toLocaleString()}`} />
        <Legend />
        <Line type="monotone" dataKey="花費" stroke="#c5221f" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="收入" stroke="#137333" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
