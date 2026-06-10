export interface DateOption {
  iso: string
  label: string
}

// 本地日期格式化(避免 UTC 偏移)
export function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 'YYYY-MM-DD' → 本地 Date(避免 new Date('YYYY-MM-DD') 以 UTC 解析造成跨日偏移)
export function parseDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

// 最近 n 天(今天、1 天前 …),供檢視截止日選單
export function lastNDates(n: number): DateOption[] {
  const out: DateOption[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = fmtDate(d)
    out.push({ iso, label: i === 0 ? `今天 (${iso})` : `${i} 天前 (${iso})` })
  }
  return out
}
