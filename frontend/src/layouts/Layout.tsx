import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-md px-3 py-1.5 text-sm transition-colors',
          isActive ? 'bg-secondary font-medium text-secondary-foreground' : 'text-muted-foreground hover:bg-muted',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/" className="text-lg font-semibold">AdInsight Hub</Link>
          <nav className="flex gap-1">
            <NavItem to="/" end>儀表板</NavItem>
            <NavItem to="/admin">後台控制台</NavItem>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">
        <Outlet />
      </main>
      {/* 推到 header 下方,避免遮擋頂部操作按鈕;expand 讓多則 toast 不疊加,依序往下排 */}
      <Toaster richColors expand position="top-right" offset={72} />
    </div>
  )
}
