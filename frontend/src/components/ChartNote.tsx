import { Calculator, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'

// 圖表底部說明:公式行用「計算機」圖示、敘述行用「燈泡」提示圖示,各自成行(自動換行)。
export default function ChartNote({ formula, children }: { formula?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
      {formula && (
        <div className="flex items-start gap-1.5">
          <Calculator className="mt-px h-3.5 w-3.5 shrink-0" />
          <div>
            <span className="font-medium text-foreground/80">公式</span>:{formula}
          </div>
        </div>
      )}
      {children && (
        <div className="flex items-start gap-1.5">
          <Lightbulb className="mt-px h-3.5 w-3.5 shrink-0" />
          <div>{children}</div>
        </div>
      )}
    </div>
  )
}
