import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = { google: '#4285F4', meta: '#1877F2', ga4: '#F9AB00' }

export default function BudgetPie({ bySource }) {
  const data = (bySource || [])
    .filter((s) => s.cost_twd > 0)
    .map((s) => ({ name: s.source, value: Math.round(s.cost_twd) }))

  if (data.length === 0) {
    return <p className="empty">尚無預算資料</p>
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={100} label>
          {data.map((d) => (
            <Cell key={d.name} fill={COLORS[d.name] || '#888'} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => `NT$${v.toLocaleString()}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
