import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const COLLAPSED_KEY = 'fat_sidebar_collapsed'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === '1')
  const location = useLocation()

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const toggleCollapse = () => {
    setCollapsed((v) => {
      const next = !v
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  const sidebarW = collapsed ? 'w-14' : 'w-56'

  return (
    <div className="min-h-screen flex bg-ds-surface text-ds-on-surface">
      {/* Desktop: fixed sidebar */}
      <div className={`hidden md:block fixed inset-y-0 left-0 z-50 transition-all duration-200 ${sidebarW}`}>
        <Navbar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile: overlay sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 w-56 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Navbar collapsed={false} onToggleCollapse={() => {}} />
      </div>

      {/* Main content */}
      <main className={`flex-1 min-w-0 transition-all duration-200 ${collapsed ? 'md:ml-14' : 'md:ml-56'}`}>
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-ds-surface border-b border-ds-outline-variant/10 md:hidden">
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 rounded-lg text-ds-on-surface-variant hover:bg-ds-surface-container-low transition-colors">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="text-sm font-bold text-ds-on-surface font-headline tracking-tight">FAT</span>
        </div>

        <div className="px-4 py-4 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
