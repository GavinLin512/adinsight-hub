import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

function BrandMark() {
  return (
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_2px_8px_hsl(172_58%_22%/0.35)]">
      <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true">
        <path d="M8 24V16M16 24V8M24 24v-5" stroke="hsl(40 30% 97%)" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  )
}

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm transition-colors duration-200',
          isActive
            ? 'bg-card font-medium text-foreground shadow-sm ring-1 ring-border/70'
            : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-3 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight">
              AdInsight <span className="text-primary">Hub</span>
            </span>
          </Link>
          {/* segmented control 式導覽,active 為浮起白底 */}
          <nav className="flex gap-1 rounded-lg bg-muted p-1">
            <NavItem to="/" end>儀表板</NavItem>
            <NavItem to="/admin">後台控制台</NavItem>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:px-6">
          <span>AdInsight Hub · 跨渠道行銷成效平台</span>
          <span>資料來源:Google Ads / Meta Ads / GA4 · 金額一律以 TWD 呈現</span>
        </div>
      </footer>
      {/* 推到 header 下方,避免遮擋頂部操作按鈕;expand 讓多則 toast 不疊加,依序往下排 */}
      <Toaster richColors expand position="top-right" offset={72} />
    </div>
  )
}
