import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, Plus, Trash2, KeyRound, UserCheck, UserX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useConfirm } from '@/components/shared/ConfirmDialog'
import { getSettings, updateSetting } from '@/api/settings'
import { getUsers, createUser, changeUserPassword, toggleUserActive, deleteUser, type User } from '@/api/users'
import { deleteOldNotifications } from '@/api/notifications'

// ──────────────────────────────────────────────────────────────────
// 일반 설정
// ──────────────────────────────────────────────────────────────────
function GeneralSettings() {
  const queryClient = useQueryClient()
  const { data: settings = [], isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (settings.length > 0) {
      const map: Record<string, string> = {}
      settings.forEach((s) => { map[s.key] = s.value })
      setValues(map)
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => updateSetting(key, value),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('설정이 저장되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="py-8 text-center text-sm text-ds-on-surface-variant">로딩 중…</div>

  // risky_ports 제외 — 별도 탭에서 관리
  const generalSettings = settings.filter(s => s.key !== 'risky_ports')

  return (
    <div className="space-y-5">
      {generalSettings.map((s) => (
        <div key={s.key} className="bg-ds-surface-container-low rounded-lg p-4">
          <p className="text-sm font-bold text-ds-on-surface font-headline">{s.key}</p>
          {s.description && <p className="text-xs text-ds-on-surface-variant mt-0.5 mb-3">{s.description}</p>}
          <div className="flex gap-2 mt-2">
            <input
              value={values[s.key] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
              className="flex-1 max-w-sm h-9 px-3 text-sm bg-ds-surface-container-lowest border border-ds-outline-variant/30 rounded-md focus:outline-none focus:border-ds-tertiary focus:ring-1 focus:ring-ds-tertiary"
            />
            <button
              onClick={() => updateMutation.mutate({ key: s.key, value: values[s.key] ?? '' })}
              disabled={updateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              저장
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 위험 포트 설정
// ──────────────────────────────────────────────────────────────────
interface RiskyPort {
  protocol: string
  port: string
  description: string
}

function RiskyPortsSettings() {
  const queryClient = useQueryClient()
  const { data: settings = [] } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const [rows, setRows] = useState<RiskyPort[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const s = settings.find(s => s.key === 'risky_ports')
    if (s) {
      try { setRows(JSON.parse(s.value) as RiskyPort[]) } catch { setRows([]) }
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: () => updateSetting('risky_ports', JSON.stringify(rows)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('위험 포트 설정이 저장되었습니다.')
      setDirty(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const update = (idx: number, key: keyof RiskyPort, val: string) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r))
    setDirty(true)
  }

  const addRow = () => { setRows(prev => [...prev, { protocol: 'TCP', port: '', description: '' }]); setDirty(true) }

  const removeRow = (idx: number) => { setRows(prev => prev.filter((_, i) => i !== idx)); setDirty(true) }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ds-on-surface-variant">위험 포트 목록을 관리합니다. 정책 분석 시 해당 포트를 허용하는 정책이 위험으로 분류됩니다.</p>

      <div className="overflow-x-auto rounded-lg border border-ds-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead className="bg-ds-surface-container-low/50">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary w-28">프로토콜</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary w-36">포트</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary">설명</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ds-outline-variant/10">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-ds-surface-container-low/20">
                <td className="px-4 py-2">
                  <select
                    value={row.protocol}
                    onChange={(e) => update(idx, 'protocol', e.target.value)}
                    className="w-full h-8 px-2 text-sm bg-ds-surface-container-lowest border border-ds-outline-variant/20 rounded focus:outline-none focus:border-ds-tertiary"
                  >
                    {['TCP', 'UDP', 'ICMP', 'ANY'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2">
                  <input
                    value={row.port}
                    onChange={(e) => update(idx, 'port', e.target.value)}
                    placeholder="예: 23, 3389"
                    className="w-full h-8 px-2 text-sm font-mono bg-ds-surface-container-lowest border border-ds-outline-variant/20 rounded focus:outline-none focus:border-ds-tertiary"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    value={row.description}
                    onChange={(e) => update(idx, 'description', e.target.value)}
                    placeholder="예: Telnet"
                    className="w-full h-8 px-2 text-sm bg-ds-surface-container-lowest border border-ds-outline-variant/20 rounded focus:outline-none focus:border-ds-tertiary"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removeRow(idx)} className="p-1 rounded hover:bg-red-50 text-ds-error transition-colors" title="삭제">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-ds-on-surface-variant italic">등록된 위험 포트가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ds-tertiary bg-ds-tertiary/10 rounded-md hover:bg-ds-tertiary/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          포트 추가
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          저장
        </button>
        {dirty && <span className="text-xs text-amber-600 font-semibold">저장되지 않은 변경사항이 있습니다</span>}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 계정 관리
// ──────────────────────────────────────────────────────────────────
function AccountSettings() {
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialogElement } = useConfirm()
  const [createOpen, setCreateOpen] = useState(false)
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false })
  const [pwDialog, setPwDialog] = useState<{ user: User; password: string } | null>(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const createMutation = useMutation({
    mutationFn: () => createUser({ username: newUser.username, password: newUser.password, is_admin: newUser.is_admin }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setCreateOpen(false)
      setNewUser({ username: '', password: '', is_admin: false })
      toast.success('계정이 생성되었습니다.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pwMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password: string }) => changeUserPassword(userId, password),
    onSuccess: () => { setPwDialog(null); toast.success('비밀번호가 변경되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ userId, is_active }: { userId: number; is_active: boolean }) => toggleUserActive(userId, is_active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('계정이 삭제되었습니다.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDelete = async (user: User) => {
    const ok = await confirm({ title: '계정 삭제', description: `'${user.username}' 계정을 삭제하시겠습니까?`, variant: 'destructive', confirmLabel: '삭제' })
    if (ok) deleteMutation.mutate(user.id)
  }

  if (isLoading) return <div className="py-8 text-center text-sm text-ds-on-surface-variant">로딩 중…</div>

  return (
    <div className="space-y-4">
      {ConfirmDialogElement}
      <div className="flex justify-between items-center">
        <p className="text-sm text-ds-on-surface-variant">시스템 계정을 관리합니다.</p>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md"
        >
          <Plus className="w-4 h-4" />
          계정 추가
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-ds-outline-variant/10">
        <table className="w-full text-left border-collapse">
          <thead className="bg-ds-surface-container-low/50">
            <tr>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary">사용자명</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary">권한</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary">상태</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-ds-primary">생성일</th>
              <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-ds-primary">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ds-outline-variant/10">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-ds-surface-container-low/20 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-mono text-sm font-semibold text-ds-on-surface">{user.username}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.is_admin ? 'bg-amber-100 text-amber-700' : 'bg-ds-surface-container text-ds-on-surface-variant'}`}>
                    {user.is_admin ? '관리자' : '일반'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-ds-on-surface-variant">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-'}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setPwDialog({ user, password: '' })}
                      title="비밀번호 변경"
                      className="p-1.5 rounded hover:bg-ds-surface-container-high text-ds-on-surface-variant hover:text-ds-primary transition-colors"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ userId: user.id, is_active: !user.is_active })}
                      title={user.is_active ? '비활성화' : '활성화'}
                      className={`p-1.5 rounded transition-colors ${user.is_active ? 'hover:bg-amber-50 text-amber-600' : 'hover:bg-green-50 text-green-600'}`}
                    >
                      {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      title="삭제"
                      className="p-1.5 rounded hover:bg-red-50 text-ds-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-ds-on-surface-variant italic">등록된 계정이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm bg-ds-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="font-headline">계정 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">사용자명 *</Label>
              <Input value={newUser.username} onChange={(e) => setNewUser(p => ({ ...p, username: e.target.value }))} required className="bg-white border-ds-outline-variant/30 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">비밀번호 *</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))} required className="bg-white border-ds-outline-variant/30 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer text-ds-on-surface-variant">
              <input type="checkbox" checked={newUser.is_admin} onChange={(e) => setNewUser(p => ({ ...p, is_admin: e.target.checked }))} className="rounded border-ds-outline-variant/40" />
              관리자 권한 부여
            </label>
            <DialogFooter>
              <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm font-semibold text-ds-on-surface-variant hover:text-ds-on-surface transition-colors">취소</button>
              <button type="submit" disabled={createMutation.isPending} className="px-5 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50">
                {createMutation.isPending ? '생성 중…' : '생성'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      {pwDialog && (
        <Dialog open onOpenChange={() => setPwDialog(null)}>
          <DialogContent className="max-w-sm bg-ds-surface-container-lowest">
            <DialogHeader>
              <DialogTitle className="font-headline">비밀번호 변경 — {pwDialog.user.username}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); pwMutation.mutate({ userId: pwDialog.user.id, password: pwDialog.password }) }} className="space-y-3 pt-1">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-ds-primary">새 비밀번호 *</Label>
                <Input
                  type="password"
                  value={pwDialog.password}
                  onChange={(e) => setPwDialog(p => p ? { ...p, password: e.target.value } : null)}
                  required
                  className="bg-white border-ds-outline-variant/30 text-sm"
                />
              </div>
              <DialogFooter>
                <button type="button" onClick={() => setPwDialog(null)} className="px-4 py-2 text-sm font-semibold text-ds-on-surface-variant hover:text-ds-on-surface transition-colors">취소</button>
                <button type="submit" disabled={pwMutation.isPending} className="px-5 py-2 text-sm font-bold text-ds-on-tertiary btn-primary-gradient rounded-md disabled:opacity-50">
                  {pwMutation.isPending ? '변경 중…' : '변경'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// 로그 설정
// ──────────────────────────────────────────────────────────────────
function LogSettings() {
  const [days, setDays] = useState(90)
  const [isDeleting, setIsDeleting] = useState(false)
  const { confirm, ConfirmDialogElement } = useConfirm()

  const handleCleanup = async () => {
    const ok = await confirm({
      title: '오래된 로그 정리',
      description: `${days}일 이상 된 활동 로그를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      variant: 'destructive',
      confirmLabel: '삭제'
    })
    if (!ok) return
    setIsDeleting(true)
    try {
      const result = await deleteOldNotifications(days)
      toast.success(`${result.deleted}건의 로그가 삭제되었습니다.`)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogElement}
      <div className="bg-ds-surface-container-low rounded-lg p-5">
        <h3 className="text-sm font-bold text-ds-on-surface mb-1">로그 자동 정리</h3>
        <p className="text-xs text-ds-on-surface-variant mb-4">지정한 일수보다 오래된 활동 로그를 삭제합니다.</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={3650}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-20 h-9 px-3 text-sm bg-ds-surface-container-lowest border border-ds-outline-variant/30 rounded-md focus:outline-none focus:border-ds-tertiary text-center"
            />
            <span className="text-sm text-ds-on-surface-variant">일 이상 된 로그 삭제</span>
          </div>
          <button
            onClick={handleCleanup}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-ds-error text-white rounded-md hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? '삭제 중…' : '지금 정리'}
          </button>
        </div>
        <p className="text-[10px] text-ds-on-surface-variant/60 mt-3">권장 보존 기간: 90일 이상</p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────
type Tab = 'general' | 'risky_ports' | 'accounts' | 'log'

const TABS: { key: Tab; label: string }[] = [
  { key: 'general',     label: '일반 설정' },
  { key: 'risky_ports', label: '위험 포트' },
  { key: 'accounts',    label: '계정 관리' },
  { key: 'log',         label: '로그 설정' },
]

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ds-on-surface">Settings</h1>
      </div>

      {/* Settings panel */}
      <div className="bg-ds-surface-container-lowest rounded-xl ambient-shadow ghost-border overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-ds-outline-variant/10 px-4 pt-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold font-headline tracking-tight transition-colors duration-200 border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-ds-tertiary border-ds-tertiary'
                  : 'text-ds-on-surface-variant border-transparent hover:text-ds-on-surface hover:border-ds-outline-variant/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'general'     && <GeneralSettings />}
          {activeTab === 'risky_ports' && <RiskyPortsSettings />}
          {activeTab === 'accounts'    && <AccountSettings />}
          {activeTab === 'log'         && <LogSettings />}
        </div>
      </div>
    </div>
  )
}
