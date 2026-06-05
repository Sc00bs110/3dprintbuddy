import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Printer,
  FolderOpen,
  ListOrdered,
  Settings,
  Layers3,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { to: '/printers', icon: Printer, key: 'printers' },
  { to: '/library', icon: FolderOpen, key: 'library' },
  { to: '/queue', icon: ListOrdered, key: 'queue' },
  { to: '/settings', icon: Settings, key: 'settings' },
] as const

export default function Layout() {
  const { t } = useTranslation()

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r border-slate-800 bg-slate-900">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-800">
          <Layers3 className="h-6 w-6 text-violet-400" strokeWidth={1.5} />
          <span className="font-semibold text-slate-100 tracking-tight">3DPrintBuddy</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3 pt-4">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>

        {/* Version */}
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-600">v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
