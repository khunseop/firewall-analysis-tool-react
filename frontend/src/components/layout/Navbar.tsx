import { useState, useMemo, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useDeviceStore } from '@/store/deviceStore'
import { listDevices, type Device } from '@/api/devices'
import { cn } from '@/lib/utils'
import { ChevronDown, Search, X } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/devices', label: 'Devices' },
  { to: '/policies', label: 'Policies' },
  { to: '/objects', label: 'Objects' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/schedules', label: 'Schedules' },
]

const VENDOR_DOT: Record<string, string> = {
  paloalto: 'bg-orange-400',
  ngf: 'bg-blue-400',
  mf2: 'bg-cyan-400',
  mock: 'bg-ds-outline',
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

function DeviceDropdown() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const { selectedIds, toggleId, clearSelection, selectAll } = useDeviceStore()

  const { data: devices = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: listDevices,
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const q = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!q) return devices
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.ip_address.toLowerCase().includes(q) || (d.group ?? '').toLowerCase().includes(q)
    )
  }, [devices, q])

  const grouped = useMemo(() => {
    if (q) return null
    const map = new Map<string, typeof devices>()
    for (const d of devices) {
      const key = d.group ?? '기타'
      const arr = map.get(key) ?? []
      arr.push(d)
      map.set(key, arr)
    }
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
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 text-[13px] rounded-lg px-3 py-1.5 transition-all',
          open
            ? 'bg-ds-tertiary/10 text-ds-tertiary'
            : 'text-ds-on-surface-variant hover:bg-black/5 hover:text-ds-on-surface'
        )}
      >
        <span className="font-medium">
          {selectedIds.length > 0 ? `장비 ${selectedIds.length}개` : '장비 선택'}
        </span>
        {selectedIds.length > 0 && (
          <span className="text-[9px] font-bold bg-ds-tertiary text-white rounded-full px-1.5 py-0.5 leading-none">
            {selectedIds.length}
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white/90 backdrop-blur-xl rounded-xl border border-white/60 shadow-ambient-md z-50">
          <div className="px-3 pt-3 pb-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-ds-on-surface-variant/60 mb-2">
              Device Selection
            </p>
            <div className="flex items-center gap-1.5 bg-ds-surface-container-low rounded-lg px-2 py-1.5">
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

          <div className="max-h-[240px] overflow-y-auto px-2 pb-1">
            {filtered.length === 0 && devices.length === 0 ? (
              <p className="text-[10px] text-ds-on-surface-variant text-center py-3 italic">장비가 없습니다</p>
            ) : filtered.length === 0 && q ? (
              <p className="text-[10px] text-ds-on-surface-variant text-center py-3 italic">검색 결과 없음</p>
            ) : grouped ? (
              Array.from(grouped.entries()).map(([groupName, groupDevices]) => (
                <div key={groupName}>
                  {grouped.size > 1 && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-ds-on-surface-variant/50 px-2 pt-2 pb-0.5">{groupName}</p>
                  )}
                  {groupDevices.map((d) => {
                    const selected = selectedIds.includes(d.id)
                    return <DeviceItem key={d.id} d={d} selected={selected} onToggle={() => toggleId(d.id)} />
                  })}
                </div>
              ))
            ) : (
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
        </div>
      )}
    </div>
  )
}

export function Navbar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-full w-full flex items-center px-4 md:px-6 gap-6 bg-white/80 backdrop-blur-xl shadow-navbar">
      {/* Logo */}
      <span className="text-[15px] font-extrabold tracking-tight text-ds-tertiary font-headline shrink-0">
        FAT
      </span>

      {/* Nav */}
      <nav className="flex items-center flex-1 overflow-x-auto min-w-0 h-full">
        {NAV_ITEMS.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'relative flex items-center h-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                'after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:rounded-full after:transition-all',
                isActive
                  ? 'text-ds-tertiary after:bg-ds-tertiary'
                  : 'text-ds-on-surface-variant hover:text-ds-on-surface after:bg-transparent'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-0.5 shrink-0">
        <DeviceDropdown />

        <div className="w-px h-4 bg-ds-outline-variant/20 mx-2" />

        <NavLink
          to="/notifications"
          className={({ isActive }) =>
            cn(
              'px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors',
              isActive ? 'text-ds-tertiary bg-ds-tertiary/8' : 'text-ds-on-surface-variant hover:bg-black/5 hover:text-ds-on-surface'
            )
          }
        >
          Notifications
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors',
              isActive ? 'text-ds-tertiary bg-ds-tertiary/8' : 'text-ds-on-surface-variant hover:bg-black/5 hover:text-ds-on-surface'
            )
          }
        >
          Settings
        </NavLink>

        <div className="w-px h-4 bg-ds-outline-variant/20 mx-2" />

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-ds-on-surface-variant/60 hover:bg-ds-error/8 hover:text-ds-error"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
