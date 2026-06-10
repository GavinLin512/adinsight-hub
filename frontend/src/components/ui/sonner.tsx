import { Toaster as Sonner, type ToasterProps } from 'sonner'

// 不覆寫 toast 底色,讓 Layout 傳入的 richColors 生效:
// success → 綠、error → 紅、warning → 黃
export function Toaster(props: ToasterProps) {
  return <Sonner className="toaster group" {...props} />
}
