import { useState, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, SlidersHorizontal, AlertTriangle, X, History } from 'lucide-react'
import type { ColDef } from '@ag-grid-community/core'
import { AgGridWrapper, type AgGridWrapperHandle } from '@/components/shared/AgGridWrapper'
import { listDevices } from '@/api/devices'
import {
  searchPolicies, getChangeLogs, exportToExcel,
  type Policy, type PolicySearchRequest, type ChangeLogEntry,
} from '@/api/firewall'
import { daysSinceHit } from '@/lib/utils'
import { ObjectDetailModal } from '@/components/shared/ObjectDetailModal'
import { PolicyHistoryModal } from '@/components/shared/PolicyHistoryModal'
import { QueryBuilder, buildRequestFromConditions, type Condition } from '@/components/shared/QueryBuilder'
import { useDeviceStore } from '@/store/deviceStore'

const ACTION_BADGE: Record<string, string> = {
  allow:  'bg-green-100 text-green-700',
  deny:   'bg-red-100 text-red-700',
  drop:   'bg-red-100 text-red-700',
  reject: 'bg-orange-100 text-orange-700',
}

const CHANGE_META: Record<string, { label: string; cls: string }> = {
  created:          { label: '추가', cls: 'bg-emerald-100 text-emerald-700' },
  updated:          { label: '변경', cls: 'bg-amber-100  text-amber-700' },
  deleted:          { label: '삭제', cls: 'bg-red-100    text-red-700' },
  hit_date_updated: { label: '히트', cls: 'bg-gray-100   text-gray-500' },
}

/** 쉼표/공백 구분 문자열 → chip 태그 렌더러 */
function TagCell({
  value, isClickable, onClickName, maxVisible = 3,
}: {
  value: string
  isClickable?: (name: string) => boolean
  onClickName?: (name: string) => void
  maxVisible?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const names = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (names.length === 0) return <span className="text-[11px] text-ds-on-surface-variant">-</span>

  const visible = expanded ? names : names.slice(0, maxVisible)
  const overflow = names.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1 items-center py-1">
      {visible.map((name, i) => {
        const clickable = isClickable?.(name) && onClickName
        return (
          <span
            key={i}
            onClick={clickable ? () => onClickName!(name) : undefined}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono leading-tight
              ${clickable
                ? 'bg-ds-secondary-container text-ds-tertiary cursor-pointer hover:bg-ds-primary-container transition-colors'
                : 'bg-ds-surface-container text-ds-on-surface'
              }`}
          >
            {name}
          </span>
        )
      })}
      {!expanded && overflow > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[10px] font-semibold text-ds-tertiary bg-ds-tertiary/5 rounded px-1.5 py-0.5 hover:bg-ds-tertiary/10"
        >
          +{overflow}
        </button>
      )}
    </div>
  )
}

/** 마지막 사용일 스마트 렌더 */
function LastHitCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-[11px] font-medium text-amber-600">사용 기록 없음</span>
  const days = daysSinceHit(value)
  if (days === null) return <span className="text-[11px] text-ds-on-surface-variant">-</span>
  if (days >= 90) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ds-error">
        <AlertTriangle className="w-3 h-3" />{days}일 미사용
      </span>
    )
  }
  if (days >= 30) return <span className="text-[11px] font-medium text-amber-600">{days}일 전</span>
  return <span className="text-[11px] text-ds-on-surface-variant">{days}일 전</span>
}

export function PoliciesPage() {
  const gridRef = useRef<AgGridWrapperHandle>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedIds: deviceIds, setSelectedIds: setDeviceIds } = useDeviceStore()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [conditions, setConditions] = useState<Condition[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [searched, setSearched] = useState(false)
  const [validObjectNames, setValidObjectNames] = useState<Set<string>>(new Set())
  const [changeLogMap, setChangeLogMap] = useState<Map<string, ChangeLogEntry>>(new Map())
  const [objectModal, setObjectModal] = useState<{ deviceId: number; name: string } | null>(null)
  const [historyModal, setHistoryModal] = useState<{ deviceId: number; ruleName: string } | null>(null)

  const { data: devices = [] } = useQuery({ queryKey: ['devices'], queryFn: listDevices })

  // URL 파라미터로 필터 자동 세팅 (ObjectDetailModal → 정책 검색 연동)
  useEffect(() => {
    const srcName = searchParams.get('src_name')
    const dstName = searchParams.get('dst_name')
    const svcName = searchParams.get('svc_name')
    const srcIp   = searchParams.get('src_ip')
    const dstIp   = searchParams.get('dst_ip')
    if (srcName || dstName || svcName || srcIp || dstIp) {
      const newConds: Condition[] = []
      if (srcName) newConds.push({ field: 'src_name', operator: 'contains', value: srcName })
      if (dstName) newConds.push({ field: 'dst_name', operator: 'contains', value: dstName })
      if (svcName) newConds.push({ field: 'service_name', operator: 'contains', value: svcName })
      if (srcIp)   newConds.push({ field: 'src_ip', operator: 'contains', value: srcIp })
      if (dstIp)   newConds.push({ field: 'dst_ip', operator: 'contains', value: dstIp })
      setConditions(newConds)
      setFiltersOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const searchMutation = useMutation({
    mutationFn: async (req: PolicySearchRequest) => {
      const [policyRes, logs] = await Promise.all([
        searchPolicies(req),
        deviceIds.length > 0 ? getChangeLogs(deviceIds).catch(() => []) : Promise.resolve([]),
      ])
      return { policyRes, logs }
    },
    onSuccess: ({ policyRes, logs }) => {
      setPolicies(policyRes.policies)
      setValidObjectNames(new Set(policyRes.valid_object_names))
      setSearched(true)

      // 변경 이력 맵 갱신 (최신 로그만)
      const map = new Map<string, ChangeLogEntry>()
      for (const log of logs as ChangeLogEntry[]) {
        const key = `${log.device_id}_${log.object_name}`
        if (!map.has(key)) map.set(key, log)
      }
      setChangeLogMap(map)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const buildRequest = (): PolicySearchRequest => {
    const payload = buildRequestFromConditions(conditions, deviceIds)
    return payload as unknown as PolicySearchRequest
  }

  const handleSearch = () => {
    if (deviceIds.length === 0) { toast.warning('장비를 선택하세요.'); return }
    searchMutation.mutate(buildRequest())
  }

  const handleReset = () => {
    setConditions([])
    setPolicies([])
    setSearched(false)
    setValidObjectNames(new Set())
    setChangeLogMap(new Map())
    gridRef.current?.gridApi?.setFilterModel(null)
  }

  const handleExport = async () => {
    if (policies.length === 0) { toast.warning('내보낼 데이터가 없습니다.'); return }
    try { await exportToExcel(policies as unknown as Record<string, unknown>[], '방화벽정책') }
    catch (e: unknown) { toast.error((e as Error).message) }
  }

  const summary = useMemo(() => {
    if (!searched || policies.length === 0) return null
    const allow    = policies.filter(p => p.action?.toLowerCase() === 'allow').length
    const deny     = policies.filter(p => ['deny', 'drop', 'reject'].includes(p.action?.toLowerCase() ?? '')).length
    const disabled = policies.filter(p => !p.enable).length
    const stale    = policies.filter(p => { const d = daysSinceHit(p.last_hit_date); return d !== null && d >= 90 }).length
    const noHit    = policies.filter(p => !p.last_hit_date).length
    return { total: policies.length, allow, deny, disabled, stale, noHit }
  }, [policies, searched])

  const deviceNameMap = useMemo(
    () => new Map(devices.map(d => [d.id, d.name])),
    [devices]
  )

  const makeCellRenderer = () => (p: { value: string; data: Policy }) => (
    <TagCell
      value={p.value}
      isClickable={(name) => validObjectNames.has(name)}
      onClickName={(name) => setObjectModal({ deviceId: p.data.device_id, name })}
    />
  )

  const columnDefs: ColDef<Policy>[] = [
    {
      headerName: '장비명',
      width: 120,
      pinned: 'left',
      valueGetter: (p) => deviceNameMap.get(p.data?.device_id ?? -1) ?? String(p.data?.device_id ?? '-'),
      cellRenderer: (p: { value: string }) => (
        <span className="text-[11px] font-semibold text-ds-tertiary font-mono">{p.value}</span>
      ),
    },
    {
      field: 'seq', headerName: '#', width: 52,
      cellRenderer: (p: { value: number }) => (
        <span className="font-mono text-xs text-ds-on-surface-variant">{p.value}</span>
      ),
    },
    {
      field: 'rule_name', headerName: '정책명', width: 200,
      cellRenderer: (p: { value: string; data: Policy }) => {
        const key = `${p.data.device_id}_${p.data.rule_name}`
        const log = changeLogMap.get(key)
        const meta = log ? (CHANGE_META[log.action] ?? { label: log.action, cls: 'bg-gray-100 text-gray-500' }) : null
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono text-xs font-semibold text-ds-on-surface truncate">{p.value ?? '-'}</span>
            {meta && (
              <button
                title={`${meta.label} — 클릭하여 이력 보기`}
                onClick={() => setHistoryModal({ deviceId: p.data.device_id, ruleName: p.data.rule_name })}
                className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-opacity hover:opacity-70 ${meta.cls}`}
              >
                <History className="w-2.5 h-2.5" />
                {meta.label}
              </button>
            )}
          </div>
        )
      },
    },
    {
      field: 'action', headerName: '액션', width: 72,
      cellRenderer: (p: { value: string }) => {
        const cls = ACTION_BADGE[p.value?.toLowerCase()] ?? 'bg-ds-surface-container text-ds-on-surface-variant'
        return <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>{p.value}</span>
      },
    },
    {
      field: 'enable', headerName: '활성', width: 62,
      cellRenderer: (p: { value: boolean }) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${p.value ? 'bg-green-100 text-green-700' : 'bg-ds-surface-container text-ds-on-surface-variant'}`}>
          {p.value ? '활성' : '비활성'}
        </span>
      ),
    },
    { field: 'source',      headerName: '출발지', flex: 1, minWidth: 140, autoHeight: true, cellRenderer: makeCellRenderer() },
    { field: 'destination', headerName: '목적지', flex: 1, minWidth: 140, autoHeight: true, cellRenderer: makeCellRenderer() },
    { field: 'service',     headerName: '서비스', minWidth: 120, autoHeight: true, cellRenderer: makeCellRenderer() },
    {
      field: 'user', headerName: '사용자', minWidth: 100, autoHeight: true,
      cellRenderer: (p: { value: string | null }) => {
        if (!p.value) return <span className="text-[11px] text-ds-on-surface-variant">-</span>
        const users = p.value.split(',').map((u) => u.trim()).filter(Boolean)
        if (users.length === 1) return <span className="font-mono text-xs text-ds-on-surface">{users[0]}</span>
        return (
          <div className="flex flex-col gap-0.5 py-1">
            {users.map((u, i) => (
              <span key={i} className="font-mono text-[11px] text-ds-on-surface leading-tight">{u}</span>
            ))}
          </div>
        )
      },
    },
    { field: 'application', headerName: '애플리케이션', width: 130, hide: true },
    {
      field: 'security_profile', headerName: '보안 프로파일', width: 130,
      cellRenderer: (p: { value: string | null }) =>
        p.value ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">{p.value}</span> : <span className="text-[11px] text-ds-on-surface-variant">-</span>,
    },
    {
      field: 'category', headerName: '카테고리', width: 100,
      cellRenderer: (p: { value: string | null }) =>
        p.value ? <span className="text-[11px] text-ds-on-surface-variant">{p.value}</span> : <span className="text-[11px] text-ds-on-surface-variant">-</span>,
    },
    {
      field: 'description', headerName: '설명', flex: 1, minWidth: 120,
      cellRenderer: (p: { value: string | null }) => (
        <span className="text-xs text-ds-on-surface-variant">{p.value ?? '-'}</span>
      ),
    },
    {
      field: 'last_hit_date', headerName: '마지막 사용일', minWidth: 120,
      cellRenderer: (p: { value: string | null }) => <LastHitCell value={p.value} />,
    },
    { field: 'vsys', headerName: 'VSYS', width: 72, hide: true },
  ]

  const hasConditions = conditions.length > 0 && conditions.some(c => c.value.trim())

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-64px)]">
      {/* Page header */}
      <header className="shrink-0">
        <h1 className="text-2xl font-extrabold tracking-tight text-ds-on-surface font-headline">Security Policies</h1>
        {/* <p className="text-ds-on-surface-variant text-xs mt-0.5">사이드바에서 장비를 선택하고 조건을 추가해 검색하세요.</p> */}
      </header>

      {/* Filter panel */}
      <div className="bg-ds-surface-container-lowest rounded-xl ambient-shadow overflow-hidden border border-ds-outline-variant/10 shrink-0">
        {/* 툴바 */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
              filtersOpen || hasConditions
                ? 'text-ds-tertiary bg-ds-tertiary/10'
                : 'text-ds-on-surface-variant bg-ds-surface-container-low hover:text-ds-tertiary'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            상세 검색
            {hasConditions && (
              <span className="ml-1 bg-ds-tertiary text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {conditions.filter(c => c.value.trim()).length}
              </span>
            )}
          </button>

          {/* 활성 조건 태그 (패널 닫혔을 때) */}
          {!filtersOpen && hasConditions && (
            <div className="flex flex-wrap gap-1.5 flex-1">
              {conditions.filter(c => c.value.trim()).map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-ds-tertiary/10 text-ds-tertiary rounded text-[11px] font-semibold">
                  {c.field}: {c.value}
                  <button onClick={() => setConditions(prev => prev.filter((_, j) => j !== i))} className="hover:text-ds-error"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {policies.length > 0 && (
              <button onClick={handleExport} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-ds-on-surface-variant bg-ds-surface-container-low rounded-md hover:text-ds-on-surface transition-colors">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            )}
            <button onClick={handleReset} className="text-xs font-semibold text-ds-on-surface-variant hover:text-ds-on-surface px-2.5 py-1.5 rounded-md hover:bg-ds-surface-container-low transition-colors">
              초기화
            </button>
            <button
              onClick={handleSearch}
              disabled={deviceIds.length === 0 || searchMutation.isPending}
              className="bg-ds-primary text-ds-on-primary text-xs font-bold px-4 py-1.5 rounded-md hover:brightness-110 transition-all disabled:opacity-50"
            >
              {searchMutation.isPending ? '검색 중…' : '검색'}
            </button>
          </div>
        </div>

        {/* 쿼리 빌더 패널 */}
        {filtersOpen && (
          <div className="border-t border-ds-outline-variant/10 bg-ds-surface-container-low/30 px-4 py-3">
            <p className="text-[10px] text-ds-on-surface-variant mb-2">조건을 추가하고 검색하세요. 여러 조건은 AND로 결합됩니다.</p>
            <QueryBuilder conditions={conditions} onChange={setConditions} />
          </div>
        )}
      </div>

      {/* Summary banner */}
      {summary && (
        <div className="bg-ds-surface-container-lowest rounded-xl ambient-shadow ghost-border px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 shrink-0">
          <span className="text-sm font-bold text-ds-on-surface">총 {summary.total.toLocaleString()}건</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><span className="w-2 h-2 rounded-full bg-green-500" />허용 {summary.allow.toLocaleString()}</span>
          <span className="flex items-center gap-1 text-xs font-semibold text-red-700"><span className="w-2 h-2 rounded-full bg-red-500" />차단 {summary.deny.toLocaleString()}</span>
          {summary.disabled > 0 && <span className="flex items-center gap-1 text-xs text-ds-on-surface-variant"><span className="w-2 h-2 rounded-full bg-gray-400" />비활성 {summary.disabled.toLocaleString()}</span>}
          {summary.stale > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><AlertTriangle className="w-3 h-3" />90일+ 미사용 {summary.stale.toLocaleString()}</span>}
          {summary.noHit > 0 && <span className="text-xs text-ds-on-surface-variant">사용 기록 없음 {summary.noHit.toLocaleString()}</span>}
        </div>
      )}

      {/* Results grid */}
      <div className="bg-ds-surface-container-lowest rounded-xl ambient-shadow ghost-border overflow-hidden flex-1 min-h-0">
        <AgGridWrapper<Policy>
          ref={gridRef}
          columnDefs={columnDefs}
          rowData={policies}
          getRowId={(p) => String(p.data.id)}
          height="100%"
          noRowsText="장비를 선택하고 검색 버튼을 클릭하세요."
          defaultColDefOverride={{ filter: false }}
        />
      </div>

      {objectModal && (
        <ObjectDetailModal
          deviceId={objectModal.deviceId}
          name={objectModal.name}
          onClose={() => setObjectModal(null)}
        />
      )}

      {historyModal && (
        <PolicyHistoryModal
          deviceId={historyModal.deviceId}
          ruleName={historyModal.ruleName}
          onClose={() => setHistoryModal(null)}
        />
      )}
    </div>
  )
}
