import { AlertTriangle, History } from 'lucide-react'
import type { Policy } from '@/api/firewall'
import { daysSinceHit } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ACTION_BADGE: Record<string, string> = {
  allow:  'bg-green-100 text-green-700',
  deny:   'bg-red-100 text-red-700',
  drop:   'bg-red-100 text-red-700',
  reject: 'bg-orange-100 text-orange-700',
}

function Section({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-ds-on-surface-variant/50 mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function ChipList({ value, isClickable, onClickName }: {
  value: string | null
  isClickable?: (name: string) => boolean
  onClickName?: (name: string) => void
}) {
  const items = (value ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (items.length === 0) return <span className="text-xs text-ds-on-surface-variant">-</span>
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => {
        const clickable = isClickable?.(item) && onClickName
        return (
          <span
            key={i}
            onClick={clickable ? () => onClickName!(item) : undefined}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono leading-tight ${
              clickable
                ? 'bg-ds-secondary-container text-ds-tertiary cursor-pointer hover:bg-ds-primary-container transition-colors'
                : 'bg-ds-surface-container text-ds-on-surface'
            }`}
          >
            {item}
          </span>
        )
      })}
    </div>
  )
}

interface PolicyDetailModalProps {
  policy: Policy
  deviceName: string
  validObjectNames: Set<string>
  onObjectClick: (deviceId: number, name: string) => void
  onHistoryClick?: (deviceId: number, ruleName: string) => void
  onClose: () => void
}

export function PolicyDetailModal({
  policy,
  deviceName,
  validObjectNames,
  onObjectClick,
  onHistoryClick,
  onClose,
}: PolicyDetailModalProps) {
  const isClickable = (name: string) => validObjectNames.has(name)
  const handleObjectClick = (name: string) => onObjectClick(policy.device_id, name)

  const days = daysSinceHit(policy.last_hit_date)
  const actionCls = ACTION_BADGE[policy.action?.toLowerCase()] ?? 'bg-ds-surface-container text-ds-on-surface-variant'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-ds-outline-variant/10 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold font-headline font-mono truncate">{policy.rule_name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-ds-tertiary font-mono">{deviceName}</span>
                <span className="text-ds-outline-variant/30">·</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${actionCls}`}>{policy.action}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${policy.enable ? 'bg-green-100 text-green-700' : 'bg-ds-surface-container text-ds-on-surface-variant'}`}>
                  {policy.enable ? '활성' : '비활성'}
                </span>
                {policy.seq != null && (
                  <span className="text-[10px] text-ds-on-surface-variant font-mono">#{policy.seq}</span>
                )}
              </div>
            </div>
            {onHistoryClick && (
              <button
                onClick={() => onHistoryClick(policy.device_id, policy.rule_name)}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-ds-on-surface-variant bg-ds-surface-container-low rounded-lg hover:text-ds-on-surface transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                이력
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Section label="출발지">
              <ChipList value={policy.source} isClickable={isClickable} onClickName={handleObjectClick} />
            </Section>
            <Section label="목적지">
              <ChipList value={policy.destination} isClickable={isClickable} onClickName={handleObjectClick} />
            </Section>
            <Section label="서비스">
              <ChipList value={policy.service} />
            </Section>
            <Section label="사용자">
              <ChipList value={policy.user} />
            </Section>
          </div>

          {(policy.description || policy.security_profile || policy.category || policy.vsys || policy.application) && (
            <div className="pt-3 border-t border-ds-outline-variant/10 grid grid-cols-2 gap-x-6 gap-y-4">
              {policy.description && (
                <Section label="설명" className="col-span-2">
                  <p className="text-xs text-ds-on-surface leading-relaxed">{policy.description}</p>
                </Section>
              )}
              {policy.security_profile && (
                <Section label="보안 프로파일">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700">
                    {policy.security_profile}
                  </span>
                </Section>
              )}
              {policy.category && (
                <Section label="카테고리">
                  <span className="text-xs text-ds-on-surface-variant">{policy.category}</span>
                </Section>
              )}
              {policy.application && (
                <Section label="애플리케이션">
                  <ChipList value={policy.application} />
                </Section>
              )}
              {policy.vsys && (
                <Section label="VSYS">
                  <span className="font-mono text-xs text-ds-on-surface-variant">{policy.vsys}</span>
                </Section>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-ds-outline-variant/10">
            <Section label="마지막 사용일">
              {!policy.last_hit_date ? (
                <span className="text-[11px] font-medium text-amber-600">사용 기록 없음</span>
              ) : days === null ? (
                <span className="text-xs text-ds-on-surface-variant">{policy.last_hit_date}</span>
              ) : days >= 90 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ds-error">
                  <AlertTriangle className="w-3 h-3" />{days}일 미사용 ({policy.last_hit_date})
                </span>
              ) : (
                <span className="text-[11px] text-ds-on-surface-variant">{days}일 전 ({policy.last_hit_date})</span>
              )}
            </Section>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-ds-outline-variant/10 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-ds-surface-container-low hover:bg-ds-surface-container text-ds-on-surface transition-colors"
          >
            닫기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
