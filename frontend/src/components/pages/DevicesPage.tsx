import { useState, useMemo, useCallback } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Upload, Download, RefreshCw, Pencil, Trash2, Wifi, Search, XCircle } from 'lucide-react'
import type { ColDef } from '@ag-grid-community/core'
import { AgGridWrapper } from '@/components/shared/AgGridWrapper'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import {
  listDevices, createDevice, updateDevice, deleteDevice,
  testConnection, syncAll, downloadDeviceTemplate, bulkImportDevices,
  type Device, type DeviceCreate, type DeviceUpdate,
} from '@/api/devices'
import { useSyncStatusWebSocket, type SyncStatusMessage } from '@/hooks/useWebSocket'

const VENDOR_OPTIONS = [
  { code: 'paloalto', label: 'Palo Alto' },
  { code: 'ngf',      label: 'SECUI NGF' },
  { code: 'mf2',      label: 'SECUI MF2' },
  { code: 'mock',     label: 'Mock' },
]

const VENDOR_BADGE: Record<string, string> = {
  paloalto: 'bg-orange-50 text-orange-600 border border-orange-100',
  ngf:      'bg-blue-50 text-blue-600 border border-blue-100',
  mf2:      'bg-cyan-50 text-cyan-600 border border-cyan-100',
  mock:     'bg-gray-50 text-gray-500 border border-gray-100',
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  success:     { label: '완료',   dot: 'bg-emerald-500',              text: 'text-emerald-700' },
  in_progress: { label: '진행중', dot: 'bg-ds-tertiary animate-pulse', text: 'text-ds-tertiary' },
  pending:     { label: '대기',   dot: 'bg-ds-outline',                text: 'text-ds-on-surface-variant' },
  failure:     { label: '실패',   dot: 'bg-ds-error',                  text: 'text-ds-error' },
  error:       { label: '오류',   dot: 'bg-ds-error',                  text: 'text-ds-error' },
}

interface DeviceFormData {
  name: string; ip_address: string; vendor: string; username: string
  password: string; password_confirm: string; ha_peer_ip: string
  model: string; group: string; description: string; collect_last_hit_date: boolean
  use_ssh_for_last_hit_date: boolean
}

const DEFAULT_FORM: DeviceFormData = {
  name: '', ip_address: '', vendor: 'paloalto', username: '', password: '', password_confirm: '',
  ha_peer_ip: '', model: '', group: '', description: '', collect_last_hit_date: true, use_ssh_for_last_hit_date: false,
}

function DeviceFormDialog({ open, onClose, initial, onSubmit, isPending }: {
  open: boolean; onClose: () => void; initial?: DeviceFormData
  onSubmit: (data: DeviceFormData) => void; isPending: boolean
}) {
  const [form, setForm] = useState<DeviceFormData>(initial ?? DEFAULT_FORM)
  const set = (key: keyof DeviceFormData, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-ds-surface-container-lowest">
        <DialogHeader>
          <DialogTitle className="font-headline text-ds-on-surface">
            {initial?.name ? '장비 수정' : '장비 추가'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '장비명 *', key: 'name' as const, required: true },
              { label: 'IP 주소 *', key: 'ip_address' as const, required: true },
              { label: '모델', key: 'model' as const },
              { label: '사용자명 *', key: 'username' as const, required: true },
              { label: 'HA Peer IP', key: 'ha_peer_ip' as const },
              { label: '그룹', key: 'group' as const },
            ].map(({ label, key, required }) => (
              <div key={key} className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">{label}</Label>
                <Input value={form[key] as string} onChange={(e) => set(key, e.target.value)} required={required} className="bg-white border-ds-outline-variant/30 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">벤더 *</Label>
              <ShadSelect value={form.vendor} onValueChange={(v) => set('vendor', v)}>
                <SelectTrigger className="bg-white border-ds-outline-variant/30 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
                </SelectContent>
              </ShadSelect>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">
                비밀번호 {!initial?.name && '*'}
              </Label>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required={!initial?.name} className="bg-white border-ds-outline-variant/30 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">
                비밀번호 확인 {!initial?.name && '*'}
              </Label>
              <Input type="password" value={form.password_confirm} onChange={(e) => set('password_confirm', e.target.value)} required={!initial?.name} className="bg-white border-ds-outline-variant/30 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">설명</Label>
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} className="bg-white border-ds-outline-variant/30 text-sm" />
          </div>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer text-ds-on-surface-variant">
              <Checkbox checked={form.collect_last_hit_date} onCheckedChange={(v) => set('collect_last_hit_date', !!v)} />
              최근 사용일 수집
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-ds-on-surface-variant">
              <Checkbox checked={form.use_ssh_for_last_hit_date} onCheckedChange={(v) => set('use_ssh_for_last_hit_date', !!v)} />
              SSH로 최근 사용일 수집
            </label>
          </div>
          <DialogFooter>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ds-on-surface-variant hover:text-ds-on-surface transition-colors">취소</button>
            <button type="submit" disabled={isPending} className="px-5 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50">
              {isPending ? '처리중…' : '저장'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DevicesPage() {
  const queryClient = useQueryClient()
  const [quickFilter, setQuickFilter] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Device | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkFile, setBulkFile] = useState<File | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { confirm, ConfirmDialogElement } = useConfirm()

  const { data: devices = [], isLoading } = useQuery({ queryKey: ['devices'], queryFn: listDevices })

  const syncCounts = useMemo(() => ({
    total:   devices.length,
    synced:  devices.filter(d => d.last_sync_status === 'success').length,
    syncing: devices.filter(d => d.last_sync_status === 'in_progress' || d.last_sync_status === 'pending').length,
    error:   devices.filter(d => d.last_sync_status === 'failure' || d.last_sync_status === 'error').length,
  }), [devices])

  const syncPct = syncCounts.total > 0 ? Math.round(syncCounts.synced / syncCounts.total * 100) : 0

  const createMutation = useMutation({
    mutationFn: (data: DeviceCreate) => createDevice(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setFormOpen(false); toast.success('장비가 추가되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeviceUpdate }) => updateDevice(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); setFormOpen(false); setEditTarget(null); toast.success('장비가 수정되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDevice(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['devices'] }); toast.success('장비가 삭제되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })
  const syncMutation = useMutation({
    mutationFn: (id: number) => syncAll(id),
    onSuccess: () => toast.success('동기화가 시작되었습니다.'),
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSyncMessage = useCallback((msg: SyncStatusMessage) => {
    queryClient.setQueryData<Device[]>(['devices'], (old) => {
      if (!old) return old
      return old.map((d) =>
        d.id === msg.device_id
          ? { ...d, last_sync_status: msg.status, last_sync_step: msg.step }
          : d
      )
    })
    if (msg.status === 'success' || msg.status === 'failure') {
      queryClient.invalidateQueries({ queryKey: ['devices'] })
    }
  }, [queryClient])

  useSyncStatusWebSocket(handleSyncMessage)

  const bulkImportMutation = useMutation({
    mutationFn: (file: File) => bulkImportDevices(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] }); setBulkOpen(false); setBulkFile(null)
      toast.success(`등록 완료: ${result.success_count}/${result.total}개 성공`)
      if (result.failed_count > 0) toast.warning(`실패: ${result.failed_devices.join(', ')}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDelete = async (device: Device) => {
    const ok = await confirm({ title: '장비 삭제', description: `'${device.name}'을(를) 삭제하시겠습니까?`, variant: 'destructive', confirmLabel: '삭제' })
    if (ok) deleteMutation.mutate(device.id)
  }

  const handleTestConnection = useCallback(async (device: Device) => {
    toast.info(`'${device.name}' 연결 테스트 중…`)
    try { toast.success((await testConnection(device.id)).message) }
    catch (e: unknown) { toast.error((e as Error).message) }
  }, [])

  const handleBulkSync = useCallback(() => {
    if (selectedIds.length === 0) return
    selectedIds.forEach(id => syncMutation.mutate(id))
    toast.info(`${selectedIds.length}개 장비 동기화를 시작합니다.`)
  }, [selectedIds, syncMutation])

  const columnDefs = useMemo((): ColDef<Device>[] => [
    {
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 44, minWidth: 44, maxWidth: 44,
      pinned: 'left', sortable: false, filter: false, resizable: false,
    },
    {
      headerName: '상태', width: 90, pinned: 'left',
      filter: 'agTextColumnFilter',
      valueGetter: (p) => STATUS_CONFIG[p.data?.last_sync_status ?? '']?.label ?? '',
      cellRenderer: (p: { data: Device }) => {
        const conf = STATUS_CONFIG[p.data?.last_sync_status ?? '']
        return conf
          ? <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${conf.text}`} title={p.data?.last_sync_step ?? ''}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
              {conf.label}
            </span>
          : <span className="text-ds-on-surface-variant/40 text-xs">—</span>
      },
    },
    {
      headerName: '장비명', width: 200, filter: 'agTextColumnFilter',
      valueGetter: (p) => `${p.data?.name ?? ''} ${p.data?.ip_address ?? ''}`,
      cellRenderer: (p: { data: Device }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-[12px] font-semibold text-ds-on-surface">{p.data?.name}</span>
          <span className="text-[10px] text-ds-on-surface-variant/60 font-mono mt-0.5">{p.data?.ip_address}</span>
        </div>
      ),
    },
    {
      field: 'vendor', headerName: '벤더', width: 110, filter: 'agTextColumnFilter',
      valueGetter: (p) => VENDOR_OPTIONS.find(v => v.code === p.data?.vendor)?.label ?? p.data?.vendor ?? '',
      cellRenderer: (p: { data: Device }) => (
        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${VENDOR_BADGE[p.data?.vendor?.toLowerCase() ?? ''] ?? 'bg-gray-50 text-gray-500 border border-gray-100'}`}>
          {VENDOR_OPTIONS.find(v => v.code === p.data?.vendor)?.label ?? p.data?.vendor}
        </span>
      ),
    },
    {
      field: 'model', headerName: '모델', width: 100, filter: 'agTextColumnFilter',
      cellRenderer: (p: { value: string }) => <span className="text-[12px] text-ds-on-surface-variant">{p.value ?? '—'}</span>,
    },
    {
      field: 'group', headerName: '그룹', width: 100, filter: 'agTextColumnFilter',
      cellRenderer: (p: { value: string }) => p.value
        ? <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-ds-tertiary/10 text-ds-tertiary">{p.value}</span>
        : <span className="text-[12px] text-ds-on-surface-variant/40">—</span>,
    },
    {
      field: 'ha_peer_ip', headerName: 'HA Peer IP', width: 130, filter: 'agTextColumnFilter',
      cellRenderer: (p: { value: string }) => <span className="font-mono text-[11px] text-ds-on-surface-variant">{p.value ?? '—'}</span>,
    },
    {
      headerName: '수집 옵션', width: 110, sortable: false, filter: false,
      cellRenderer: (p: { data: Device }) => (
        <div className="flex gap-1 flex-wrap items-center">
          {p.data?.collect_last_hit_date && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">히트수집</span>}
          {p.data?.use_ssh_for_last_hit_date && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100">SSH</span>}
          {!p.data?.collect_last_hit_date && !p.data?.use_ssh_for_last_hit_date && <span className="text-[12px] text-ds-on-surface-variant/40">—</span>}
        </div>
      ),
    },
    {
      headerName: '마지막 동기화', width: 130, filter: 'agTextColumnFilter',
      valueGetter: (p) => formatRelativeTime(p.data?.last_sync_at ?? null),
      cellRenderer: (p: { value: string }) => <span className="text-[12px] text-ds-on-surface-variant">{p.value}</span>,
    },
    {
      headerName: '작업', width: 124, minWidth: 124, maxWidth: 124,
      sortable: false, filter: false, resizable: false, pinned: 'right',
      cellRenderer: (p: { data: Device }) => (
        <div className="flex justify-end gap-0.5">
          <button onClick={() => { setEditTarget(p.data); setFormOpen(true) }} className="p-1.5 hover:bg-ds-surface-container-high rounded-lg text-ds-on-surface-variant hover:text-ds-primary transition-colors" title="수정">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => syncMutation.mutate(p.data?.id)} className="p-1.5 hover:bg-ds-surface-container-high rounded-lg text-ds-on-surface-variant hover:text-ds-primary transition-colors" title="동기화">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleTestConnection(p.data)} className="p-1.5 hover:bg-ds-surface-container-high rounded-lg text-ds-on-surface-variant hover:text-ds-primary transition-colors" title="연결 테스트">
            <Wifi className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(p.data)} className="p-1.5 hover:bg-red-50 rounded-lg text-ds-on-surface-variant hover:text-ds-error transition-colors" title="삭제">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ], [handleDelete, handleTestConnection, setEditTarget, setFormOpen, syncMutation])

  return (
    <div className="flex flex-col gap-6">
      {ConfirmDialogElement}

      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-xl font-semibold tracking-tight text-ds-on-surface">Devices</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['devices'] })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-ds-on-surface-variant bg-white rounded-lg shadow-sm border border-ds-outline-variant/10 hover:text-ds-on-surface hover:bg-ds-surface-container-low transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            갱신
          </button>
          <button
            onClick={() => { setEditTarget(null); setFormOpen(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold btn-primary-gradient text-ds-on-tertiary rounded-lg shadow-sm hover:opacity-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            장비 추가
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-on-surface-variant/60">전체 장비</p>
          <p className="text-2xl font-bold tabular-nums text-ds-on-surface mt-1.5">
            {isLoading ? '…' : syncCounts.total}
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1 bg-ds-surface-container-high rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${syncPct}%` }} />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-ds-on-surface-variant">{syncPct}%</span>
          </div>
          <p className="text-[10px] text-ds-on-surface-variant/60 mt-1">{syncCounts.synced}대 동기화 완료</p>
        </div>

        <div className="card rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-on-surface-variant/60">동기화 완료</p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 mt-1.5">
            {isLoading ? '…' : syncCounts.synced}
          </p>
          <p className="text-[10px] text-ds-on-surface-variant/60 mt-3">정상 수집 장비</p>
        </div>

        <div className="card rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-on-surface-variant/60">동기화 중</p>
          <p className={`text-2xl font-bold tabular-nums mt-1.5 ${syncCounts.syncing > 0 ? 'text-ds-tertiary' : 'text-ds-on-surface'}`}>
            {isLoading ? '…' : syncCounts.syncing}
          </p>
          <p className="text-[10px] text-ds-on-surface-variant/60 mt-3">
            {syncCounts.syncing > 0 ? '수집 진행 중' : '진행 없음'}
          </p>
        </div>

        <div className="card rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-on-surface-variant/60">오류</p>
          <p className={`text-2xl font-bold tabular-nums mt-1.5 ${syncCounts.error > 0 ? 'text-ds-error' : 'text-ds-on-surface'}`}>
            {isLoading ? '…' : syncCounts.error}
          </p>
          <p className="text-[10px] text-ds-on-surface-variant/60 mt-3">
            {syncCounts.error > 0 ? '조치 필요' : '정상'}
          </p>
        </div>
      </div>

      {/* 장비 테이블 */}
      <div className="card rounded-xl flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-ds-on-surface">등록된 장비</span>
            {devices.length > 0 && (
              <span className="text-[11px] text-ds-on-surface-variant/50 tabular-nums">{devices.length}대</span>
            )}
            {selectedIds.length > 0 && (
              <span className="text-[11px] font-semibold text-ds-tertiary tabular-nums">{selectedIds.length}개 선택</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkSync}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold btn-primary-gradient text-ds-on-tertiary rounded-lg hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-3 h-3" />
                선택 동기화 ({selectedIds.length})
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-ds-surface-container-low rounded-lg px-2.5 py-1.5 border border-ds-outline-variant/10">
              <Search className="w-3 h-3 text-ds-on-surface-variant shrink-0" />
              <input
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                placeholder="장비명, IP 검색"
                className="text-[12px] bg-transparent outline-none text-ds-on-surface placeholder:text-ds-on-surface-variant/40 w-36"
              />
              {quickFilter && (
                <button onClick={() => setQuickFilter('')}>
                  <XCircle className="w-3 h-3 text-ds-on-surface-variant hover:text-ds-on-surface" />
                </button>
              )}
            </div>
            <button
              onClick={() => setBulkOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ds-on-surface-variant bg-ds-surface-container-low rounded-lg border border-ds-outline-variant/10 hover:text-ds-on-surface transition-colors"
            >
              <Upload className="w-3 h-3" />
              일괄 등록
            </button>
            <button
              onClick={downloadDeviceTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ds-on-surface-variant bg-ds-surface-container-low rounded-lg border border-ds-outline-variant/10 hover:text-ds-on-surface transition-colors"
            >
              <Download className="w-3 h-3" />
              템플릿
            </button>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              실시간
            </div>
          </div>
        </div>

        <AgGridWrapper<Device>
          columnDefs={columnDefs}
          rowData={devices}
          getRowId={(p) => String(p.data.id)}
          quickFilterText={quickFilter}
          height="calc(100vh - 380px)"
          noRowsText="등록된 장비가 없습니다."
          rowSelection="multiple"
          onSelectionChanged={(rows) => setSelectedIds(rows.map(r => r.id))}
          getRowStyle={(p) => {
            const s = p.data?.last_sync_status
            return (s === 'failure' || s === 'error')
              ? { borderLeft: '2px solid #9f403d', backgroundColor: 'rgba(254, 226, 226, 0.12)' }
              : { borderLeft: '2px solid transparent' }
          }}
          fitColumns
        />
      </div>

      {/* 장비 폼 다이얼로그 */}
      <DeviceFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        initial={editTarget ? {
          name: editTarget.name, ip_address: editTarget.ip_address, vendor: editTarget.vendor,
          username: editTarget.username, password: '', password_confirm: '',
          ha_peer_ip: editTarget.ha_peer_ip ?? '', model: editTarget.model ?? '',
          group: editTarget.group ?? '', description: editTarget.description ?? '',
          collect_last_hit_date: editTarget.collect_last_hit_date,
          use_ssh_for_last_hit_date: editTarget.use_ssh_for_last_hit_date,
        } : undefined}
        onSubmit={(data) => {
          if (editTarget) {
            const payload: DeviceUpdate = { ...data }
            if (!data.password) { delete payload.password; delete payload.password_confirm }
            updateMutation.mutate({ id: editTarget.id, data: payload })
          } else {
            createMutation.mutate(data as DeviceCreate)
          }
        }}
        isPending={createMutation.isPending || updateMutation.isPending}
      />

      {/* 일괄 등록 다이얼로그 */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="bg-ds-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="font-headline text-ds-on-surface">장비 일괄 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ds-on-surface-variant">Excel 파일을 업로드하여 여러 장비를 한번에 등록합니다.</p>
            <Input type="file" accept=".xlsx,.xls" onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)} className="bg-white border-ds-outline-variant/30" />
          </div>
          <DialogFooter>
            <button onClick={() => setBulkOpen(false)} className="px-4 py-2 text-sm font-semibold text-ds-on-surface-variant hover:text-ds-on-surface transition-colors">취소</button>
            <button
              disabled={!bulkFile || bulkImportMutation.isPending}
              onClick={() => bulkFile && bulkImportMutation.mutate(bulkFile)}
              className="px-5 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50"
            >
              {bulkImportMutation.isPending ? '등록 중…' : '등록'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
