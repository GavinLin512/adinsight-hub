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
