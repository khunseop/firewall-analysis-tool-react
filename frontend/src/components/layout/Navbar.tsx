import { useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useDeviceStore } from '@/store/deviceStore'
import { listDevices, type Device } from '@/api/devices'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Monitor, Shield, Package, SearchCode,
  CalendarClock, Bell, Settings, LogOut, ShieldCheck,
  ChevronDown, ChevronRight, Search, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/devices', label: 'Devices', icon: Monitor },
  { to: '/policies', label: 'Policies', icon: Shield },
  { to: '/objects', label: 'Objects', icon: Package },
  { to: '/analysis', label: 'Analysis', icon: SearchCode },
  { to: '/schedules', label: 'Schedules', icon: CalendarClock },
]

const VENDOR_DOT: Record<string, string> = {
  paloalto: 'bg-orange-400',
  ngf:      'bg-blue-400',
  mf2:      'bg-cyan-400',
  mock:     'bg-ds-outline',
}

function DeviceItem({ d, selected, onToggle }: { d: Device; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-[11px]',
        selected
          ? 'bg-ds-tertiary/8 text-ds-tertiary'
          : 'text-ds-on-surface-variant hover:bg-ds-surface-container-low hover:text-ds-on-surface'
      )}
    >
      <span className={cn(
        'w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center',
        selected ? 'bg-ds-tertiary border-ds-tertiary' : 'border-ds-outline-variant/40'
      )}>
        {selected && <span className="w-1.5 h-1.5 bg-white rounded-sm" />}
      </span>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full shrink-0',
        VENDOR_DOT[d.vendor?.toLowerCase()] ?? 'bg-ds-outline'
      )} />
      <span className="truncate font-mono leading-tight">{d.name}</span>
    </button>
  )
}

function DevicePanel() {
  const [open, setOpen] = useState(true)
  const [search, setSearch] = useState('')

  const { selectedIds, toggleId, clearSelection, selectAll } = useDeviceStore()

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    staleTime: 5 * 60_000,
  })

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return devices
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.ip_address.toLowerCase().includes(q) || (d.group ?? '').toLowerCase().includes(q)
    )
  }, [devices, q])

  // Group devices by their group attribute (only when not searching)
  const grouped = useMemo(() => {
    if (q) return null
    const map = new Map<string, typeof devices>()
    for (const d of devices) {
      const key = d.group ?? '기타'
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
    // Sort: selected devices first within each group
    for (const [key, arr] of map) {
      map.set(key, [...arr].sort((a, b) => {
        const aS = selectedIds.includes(a.id) ? 0 : 1
        const bS = selectedIds.includes(b.id) ? 0 : 1
        return aS - bS
      }))
    }
    return map
  }, [devices, q, selectedIds])

  const allIds = devices.map((d) => d.id)
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))

  return (
    <div className="mx-3 mb-1 rounded-xl border border-ds-outline-variant/10 bg-ds-surface-container-lowest/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-ds-surface-container-low/40 transition-colors"
      >
        <span className="text-[9px] font-bold uppercase tracking-widest text-ds-on-surface-variant">
          Device Selection
        </span>
        <div className="flex items-center gap-1.5">
          {selectedIds.length > 0 && (
            <span className="text-[9px] font-bold bg-ds-tertiary text-white rounded-full px-1.5 py-0.5 leading-none">
              {selectedIds.length}
            </span>
          )}
          {open
            ? <ChevronDown className="w-3 h-3 text-ds-on-surface-variant" />
            : <ChevronRight className="w-3 h-3 text-ds-on-surface-variant" />}
        </div>
      </button>

      {open && (
        <>
          <div className="px-2 pb-1.5">
            <div className="flex items-center gap-1.5 bg-ds-surface-container-low rounded-lg px-2 py-1.5 border border-ds-outline-variant/15">
              <Search className="w-3 h-3 text-ds-on-surface-variant shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="장비 검색…"
                className="flex-1 text-[11px] bg-transparent outline-none text-ds-on-surface placeholder:text-ds-on-surface-variant/50 min-w-0"
              />
              {search && (
                <button onClick={() => setSearch('')} className="shrink-0">
                  <X className="w-3 h-3 text-ds-on-surface-variant hover:text-ds-on-surface" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[200px] overflow-y-auto px-2 pb-1">
            {filtered.length === 0 && devices.length === 0 ? (
              <p className="text-[10px] text-ds-on-surface-variant text-center py-3 italic">장비가 없습니다</p>
            ) : filtered.length === 0 && q ? (
              <p className="text-[10px] text-ds-on-surface-variant text-center py-3 italic">검색 결과 없음</p>
            ) : grouped ? (
              // 그룹별 표시
              Array.from(grouped.entries()).map(([groupName, groupDevices]) => (
                <div key={groupName}>
                  {grouped.size > 1 && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ds-on-surface-variant/50 px-2 pt-2 pb-0.5">{groupName}</p>
                  )}
                  {groupDevices.map((d) => {
                    const selected = selectedIds.includes(d.id)
                    return (
                      <DeviceItem key={d.id} d={d} selected={selected} onToggle={() => toggleId(d.id)} />
                    )
                  })}
                </div>
              ))
            ) : (
              // 검색 결과 평면 표시
              filtered.map((d) => {
                const selected = selectedIds.includes(d.id)
                return <DeviceItem key={d.id} d={d} selected={selected} onToggle={() => toggleId(d.id)} />
              })
            )}
          </div>

          <div className="flex items-center gap-1 px-2 pb-2 pt-1 border-t border-ds-outline-variant/10">
            <button
              onClick={() => (isAllSelected ? clearSelection() : selectAll(allIds))}
              className="flex-1 text-[10px] font-semibold text-ds-on-surface-variant hover:text-ds-tertiary transition-colors py-1 rounded hover:bg-ds-tertiary/5"
            >
              {isAllSelected ? '전체 해제' : '전체 선택'}
            </button>
            <span className="text-ds-outline-variant/30">|</span>
            <button
              onClick={clearSelection}
              disabled={selectedIds.length === 0}
              className="flex-1 text-[10px] font-semibold text-ds-on-surface-variant hover:text-ds-error transition-colors py-1 rounded hover:bg-ds-error/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              초기화
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface NavbarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export function Navbar({ collapsed = false, onToggleCollapse }: NavbarProps) {
  const logout = useAuthStore((s) => s.logout)
  const { selectedIds } = useDeviceStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (collapsed) {
    return (
      <aside className="h-full w-full flex flex-col bg-ds-surface-container-low border-r border-ds-outline-variant/5">
        {/* Logo — icon only */}
        <div className="flex items-center justify-center py-5">
          <div className="relative w-9 h-9 rounded-xl bg-ds-tertiary flex items-center justify-center shrink-0 shadow-lg shadow-ds-tertiary/20">
            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
            {selectedIds.length > 0 && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold bg-ds-error text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {selectedIds.length > 9 ? '9+' : selectedIds.length}
              </span>
            )}
          </div>
        </div>

        {/* Nav icons */}
        <nav className="flex-1 overflow-y-auto px-1.5 space-y-1 pt-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-center p-2.5 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-white text-ds-tertiary shadow-sm'
                    : 'text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/50'
                )
              }
            >
              {({ isActive }) => (
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive ? 'text-ds-tertiary' : 'text-ds-on-surface-variant'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-1.5 border-t border-ds-outline-variant/10 space-y-1">
          <NavLink
            to="/notifications"
            title="활동 로그"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center p-2.5 rounded-xl transition-all duration-200',
                isActive ? 'bg-white text-ds-tertiary shadow-sm' : 'text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface'
              )
            }
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
          </NavLink>

          <NavLink
            to="/settings"
            title="설정"
            className={({ isActive }) =>
              cn(
                'flex items-center justify-center p-2.5 rounded-xl transition-all duration-200',
                isActive ? 'bg-white text-ds-tertiary shadow-sm' : 'text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface'
              )
            }
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
          </NavLink>

          <button
            onClick={handleLogout}
            title="로그아웃"
            className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 text-ds-on-surface-variant hover:bg-ds-error/5 hover:text-ds-error"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Expand toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="사이드바 펼치기"
              className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 text-ds-on-surface-variant hover:bg-ds-surface-container-high/50 hover:text-ds-on-surface"
            >
              <PanelLeftOpen className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </aside>
    )
  }

  return (
    <aside className="h-full w-full flex flex-col bg-ds-surface-container-low border-r border-ds-outline-variant/5">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 rounded-xl bg-ds-tertiary flex items-center justify-center shrink-0 shadow-lg shadow-ds-tertiary/20">
          <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-tighter text-ds-on-surface font-headline leading-none block">FAT</span>
          <span className="text-[10px] text-ds-on-surface-variant font-medium mt-1.5 block leading-tight">Firewall Analysis Tool</span>
        </div>
      </div>

      {/* Device Panel */}
      <DevicePanel />

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 pt-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200',
                    isActive
                      ? 'bg-white text-ds-tertiary font-bold shadow-sm'
                      : 'text-ds-on-surface-variant hover:text-ds-on-surface hover:bg-white/50'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4.5 h-4.5 shrink-0 transition-colors',
                        isActive ? 'text-ds-tertiary' : 'text-ds-on-surface-variant group-hover:text-ds-on-surface'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className="tracking-tight">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-ds-outline-variant/10 bg-ds-surface-container-low/30">
        <div className="flex items-center justify-between">
          <NavLink
            to="/notifications"
            title="활동 로그"
            className={({ isActive }) =>
              cn(
                'p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center flex-1',
                isActive ? 'bg-white text-ds-tertiary shadow-sm' : 'text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface'
              )
            }
          >
            <Bell className="w-5 h-5" strokeWidth={2} />
          </NavLink>

          <NavLink
            to="/settings"
            title="설정"
            className={({ isActive }) =>
              cn(
                'p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center flex-1',
                isActive ? 'bg-white text-ds-tertiary shadow-sm' : 'text-ds-on-surface-variant hover:bg-white/50 hover:text-ds-on-surface'
              )
            }
          >
            <Settings className="w-5 h-5" strokeWidth={2} />
          </NavLink>

          <button
            onClick={handleLogout}
            title="로그아웃"
            className="p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center flex-1 text-ds-on-surface-variant hover:bg-ds-error/5 hover:text-ds-error"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
          </button>

          {/* Collapse toggle */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="사이드바 접기"
              className="p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center flex-1 text-ds-on-surface-variant hover:bg-ds-surface-container-high/50 hover:text-ds-on-surface"
            >
              <PanelLeftClose className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
