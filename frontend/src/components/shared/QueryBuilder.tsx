import { Plus, X } from 'lucide-react'

// ─── 필드 정의 ────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'date' | 'select'
type OperatorKey = 'contains' | 'equals' | 'not_equals' | 'not_contains' | 'gte' | 'lte'

interface FieldOption { value: string; label: string }

interface FieldDef {
  key: string
  label: string
  type: FieldType
  operators: OperatorKey[]
  options?: FieldOption[]   // type === 'select' 일 때
  placeholder?: string
}

export const QB_FIELDS: FieldDef[] = [
  { key: 'rule_name',     label: '정책명',          type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: 'web-policy' },
  { key: 'vsys',          label: '가상시스템',       type: 'text',   operators: ['contains', 'equals'], placeholder: 'vsys1' },
  { key: 'src_ip',        label: '출발지 IP',        type: 'text',   operators: ['equals', 'not_equals'], placeholder: '10.0.0.0/8' },
  { key: 'dst_ip',        label: '목적지 IP',        type: 'text',   operators: ['equals', 'not_equals'], placeholder: '0.0.0.0/0' },
  { key: 'src_name',      label: '출발지 객체명',    type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: 'host-10.0.0.1' },
  { key: 'dst_name',      label: '목적지 객체명',    type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: 'server-group' },
  { key: 'service',       label: '서비스/포트',      type: 'text',   operators: ['equals', 'not_equals'], placeholder: 'tcp/443 또는 http' },
  { key: 'service_name',  label: '서비스 객체명',    type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: 'svc-https' },
  { key: 'action',        label: '액션',             type: 'text',   operators: ['equals', 'not_equals'], placeholder: 'allow' },
  { key: 'enable',        label: '활성화',           type: 'select', operators: ['equals'],
    options: [{ value: 'true', label: '활성' }, { value: 'false', label: '비활성' }] },
  { key: 'user',          label: '사용자',           type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: '' },
  { key: 'application',   label: '애플리케이션',     type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: '' },
  { key: 'description',   label: '설명',             type: 'text',   operators: ['contains', 'not_contains', 'equals', 'not_equals'], placeholder: '' },
  { key: 'last_hit_from', label: '마지막 매칭 시작', type: 'date',   operators: ['gte'] },
  { key: 'last_hit_to',   label: '마지막 매칭 종료', type: 'date',   operators: ['lte'] },
]

export const OP_LABELS: Record<OperatorKey, string> = {
  contains:     '포함',
  not_contains: '미포함',
  equals:       '=',
  not_equals:   '≠',
  gte:          '이후 (≥)',
  lte:          '이전 (≤)',
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface Condition {
  field: string
  operator: OperatorKey
  value: string
}

function getFieldDef(key: string): FieldDef {
  return QB_FIELDS.find(f => f.key === key) ?? QB_FIELDS[0]
}

// ─── 빌드 헬퍼 (외부에서 임포트 가능) ─────────────────────────────────────────

export function buildRequestFromConditions(
  conditions: Condition[],
  deviceIds: number[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    device_ids: deviceIds,
    rule_name: null, rule_name_negate: false,
    vsys: null, vsys_negate: false,
    user: null, user_negate: false,
    application: null, application_negate: false,
    description: null, description_negate: false,
    action: null, action_negate: false,
    enable: null,
    last_hit_date_from: null, last_hit_date_to: null,
    src_ips: [], dst_ips: [], services: [],
    src_names: [], dst_names: [], service_names: [],
    src_ips_exclude: [], dst_ips_exclude: [], services_exclude: [],
    src_names_exclude: [], dst_names_exclude: [], service_names_exclude: [],
  }

  for (const { field, operator, value } of conditions) {
    const v = value?.trim()
    if (!v) continue
    const isNot = operator === 'not_equals' || operator === 'not_contains'
    switch (field) {
      case 'rule_name':
        payload.rule_name = v
        payload.rule_name_negate = isNot
        break
      case 'vsys':
        payload.vsys = v
        payload.vsys_negate = isNot
        break
      case 'user':
        payload.user = v
        payload.user_negate = isNot
        break
      case 'application':
        payload.application = v
        payload.application_negate = isNot
        break
      case 'description':
        payload.description = v
        payload.description_negate = isNot
        break
      case 'action':
        payload.action = v
        payload.action_negate = isNot
        break
      case 'enable':
        payload.enable = v === 'true'
        break
      case 'src_ip':
        if (isNot) (payload.src_ips_exclude as string[]).push(v)
        else (payload.src_ips as string[]).push(v)
        break
      case 'dst_ip':
        if (isNot) (payload.dst_ips_exclude as string[]).push(v)
        else (payload.dst_ips as string[]).push(v)
        break
      case 'src_name':
        if (isNot) (payload.src_names_exclude as string[]).push(v)
        else (payload.src_names as string[]).push(v)
        break
      case 'dst_name':
        if (isNot) (payload.dst_names_exclude as string[]).push(v)
        else (payload.dst_names as string[]).push(v)
        break
      case 'service':
        if (isNot) (payload.services_exclude as string[]).push(v)
        else (payload.services as string[]).push(v)
        break
      case 'service_name':
        if (isNot) (payload.service_names_exclude as string[]).push(v)
        else (payload.service_names as string[]).push(v)
        break
      case 'last_hit_from':
        payload.last_hit_date_from = v
        break
      case 'last_hit_to':
        payload.last_hit_date_to = v
        break
    }
  }

  return payload
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface QueryBuilderProps {
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

export function QueryBuilder({ conditions, onChange }: QueryBuilderProps) {
  const add = () => {
    const def = QB_FIELDS[0]
    onChange([...conditions, { field: def.key, operator: def.operators[0], value: '' }])
  }

  const remove = (idx: number) => {
    onChange(conditions.filter((_, i) => i !== idx))
  }

  const update = (idx: number, patch: Partial<Condition>) => {
    onChange(conditions.map((c, i) => {
      if (i !== idx) return c
      const next = { ...c, ...patch }
      // 필드가 바뀌면 operator / value 초기화
      if (patch.field && patch.field !== c.field) {
        const def = getFieldDef(patch.field)
        next.operator = def.operators[0]
        next.value = def.type === 'select' ? def.options![0].value : ''
      }
      return next
    }))
  }

  return (
    <div className="space-y-2">
      {conditions.map((cond, idx) => {
        const def = getFieldDef(cond.field)
        return (
          <div key={idx} className="flex items-center gap-2">
            {/* 필드 선택 */}
            <select
              value={cond.field}
              onChange={e => update(idx, { field: e.target.value })}
              className="shrink-0 bg-white border border-ds-outline-variant/25 rounded text-xs px-2 py-1.5 focus:outline-none focus:border-ds-tertiary focus:ring-1 focus:ring-ds-tertiary"
            >
              {QB_FIELDS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>

            {/* 연산자 선택 */}
            <select
              value={cond.operator}
              onChange={e => update(idx, { operator: e.target.value as OperatorKey })}
              className="shrink-0 w-24 bg-white border border-ds-outline-variant/25 rounded text-xs px-2 py-1.5 focus:outline-none focus:border-ds-tertiary focus:ring-1 focus:ring-ds-tertiary"
            >
              {def.operators.map(op => (
                <option key={op} value={op}>{OP_LABELS[op]}</option>
              ))}
            </select>

            {/* 값 입력 */}
            <div className="flex-1">
              {def.type === 'select' ? (
                <select
                  value={cond.value}
                  onChange={e => update(idx, { value: e.target.value })}
                  className="w-full bg-white border border-ds-outline-variant/25 rounded text-xs px-2 py-1.5 focus:outline-none focus:border-ds-tertiary focus:ring-1 focus:ring-ds-tertiary"
                >
                  {def.options!.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={def.type === 'date' ? 'date' : 'text'}
                  value={cond.value}
                  onChange={e => update(idx, { value: e.target.value })}
                  placeholder={def.placeholder ?? '값 입력'}
                  className="w-full bg-white border border-ds-outline-variant/25 rounded text-xs px-2 py-1.5 font-mono focus:outline-none focus:border-ds-tertiary focus:ring-1 focus:ring-ds-tertiary"
                />
              )}
            </div>

            {/* 삭제 */}
            <button
              onClick={() => remove(idx)}
              className="shrink-0 p-1.5 rounded hover:bg-ds-error/10 text-ds-on-surface-variant hover:text-ds-error transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}

      <button
        onClick={add}
        className="flex items-center gap-1.5 text-xs font-semibold text-ds-tertiary hover:text-ds-tertiary/80 transition-colors mt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        조건 추가
      </button>
    </div>
  )
}
