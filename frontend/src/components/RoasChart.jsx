import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const COLORS = { google: '#4285F4', meta: '#1877F2', ga4: '#F9AB00' }

export default function RoasChart({ bySource }) {
  const data = (bySource || [])
    .filter((s) => s.roas != null)
    .map((s) => ({ source: s.source, roas: s.roas }))

  if (data.length === 0) {
    return <p className="empty">尚無 ROAS 資料</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="source" />
        <YAxis />
        <Tooltip formatter={(v) => `${v}x`} />
        <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.source} fill={COLORS[d.source] || '#888'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
