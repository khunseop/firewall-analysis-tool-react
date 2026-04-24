# FAT Design System

FAT(Firewall Analysis Tool)의 프론트엔드 디자인 언어 문서입니다.  
디자인 철학: **Enterprise Sleek** — 데이터 중심의 인터페이스에서 과한 장식 없이 계층과 밀도로 시각적 무게감을 만든다.

---

## 1. 컬러 토큰 (`ds-*`)

`tailwind.config.js`에 정의된 커스텀 색상. 모든 UI에서 `bg-ds-*`, `text-ds-*`, `border-ds-*` 형태로 사용한다.

### Surface (배경 레이어)
| 토큰 | 값 | 사용처 |
|---|---|---|
| `ds-surface` | `#f7f9fb` | 앱 전체 배경 |
| `ds-surface-container-lowest` | `#ffffff` | 카드, 모달 |
| `ds-surface-container-low` | `#f0f4f7` | 검색창, 입력 배경, 호버 |
| `ds-surface-container` | `#e8eff3` | 섹션 구분 |
| `ds-surface-container-high` | `#e1e9ee` | 진한 배경 영역 |
| `ds-surface-container-highest` | `#d9e4ea` | — |

### On-Surface (텍스트)
| 토큰 | 값 | 사용처 |
|---|---|---|
| `ds-on-surface` | `#2a3439` | 본문, 제목, 주요 레이블 |
| `ds-on-surface-variant` | `#566166` | 보조 텍스트, 플레이스홀더 |

### Tertiary (브랜드 액션 컬러 — 파랑)
| 토큰 | 값 | 사용처 |
|---|---|---|
| `ds-tertiary` | `#005bc4` | 활성 링크, 프로그레스 바, 배지 |
| `ds-on-tertiary` | `#f9f8ff` | 파랑 배경 위 텍스트 |
| `ds-tertiary-container` | `#4388fd` | 강조 컨테이너 |

### Error
| 토큰 | 값 | 사용처 |
|---|---|---|
| `ds-error` | `#9f403d` | 오류 텍스트, 경고 배너, 삭제 버튼 호버 |
| `ds-on-error` | `#fff7f6` | 에러 배경 위 텍스트 |

### Outline (경계선)
| 토큰 | 값 | 사용처 |
|---|---|---|
| `ds-outline` | `#717c82` | 구분선, 비활성 상태 도트 |
| `ds-outline-variant` | `#a9b4b9` | 카드 경계, 테이블 구분선 |

> **패턴**: 카드 테두리는 `border border-ds-outline-variant/8` (8% 불투명도)을 기본으로 사용한다.  
> 더 강한 구분이 필요하면 `/10`, `/15`로 높인다.

---

## 2. 타이포그래피

### 폰트 패밀리
| 역할 | 폰트 | 클래스 |
|---|---|---|
| 본문 / 데이터 | Inter + Pretendard (한글 fallback) | `font-sans` (기본) |
| 헤드라인 | Manrope | `font-headline` |
| 숫자 / 코드 | JetBrains Mono | `font-mono` |

### 텍스트 사이즈 패턴
| 용도 | 클래스 | 특징 |
|---|---|---|
| 페이지 제목 | `text-xl font-semibold tracking-tight` | 모든 페이지 통일 |
| 카드 섹션 제목 | `text-[13px] font-semibold` | — |
| KPI 숫자 | `text-2xl font-bold tabular-nums` | `tabular-nums` 필수 |
| 테이블 헤더 | `text-[10px] font-bold uppercase tracking-widest` | 모두 대문자, 넓은 자간 |
| 테이블 본문 | `text-[12px]` | — |
| 배지 / 태그 | `text-[10px] font-bold uppercase tracking-wide` | — |
| 보조 정보 (IP, 시간) | `text-[10px] font-mono` | monospace |
| 미세 주석 | `text-[10px] text-ds-on-surface-variant/60` | 60% 불투명도 |

---

## 3. 레이아웃

### 페이지 구조
```tsx
// 모든 페이지의 루트 컨테이너
<div className="flex flex-col gap-6">
  {/* 헤더: 제목 + 액션 버튼 */}
  <div className="flex items-center justify-between shrink-0">
    <h1 className="text-xl font-semibold tracking-tight text-ds-on-surface">...</h1>
    {/* 버튼들 */}
  </div>

  {/* KPI 카드 그리드 */}
  <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">...</div>

  {/* 메인 콘텐츠 카드 */}
  <div className="bg-white rounded-xl border border-ds-outline-variant/8 shadow-sm flex flex-col overflow-hidden">
    ...
  </div>
</div>
```

### Navbar
- 높이: `h-13` (3.25rem, `spacing.13` 커스텀 값)
- 스타일: `bg-white/80 backdrop-blur-xl shadow-navbar` — 글래스모피즘
- 로고 타이포: `text-[15px] font-extrabold text-ds-tertiary font-headline`
- 활성 링크: `text-ds-tertiary` + `after:` pseudo로 하단 2px 파랑 언더라인
- 비활성 링크: `text-ds-on-surface-variant`, 호버 시 `hover:text-ds-on-surface`

### 배경
```css
body {
  background-color: #f4f7fa;
  background-image: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0, 91, 196, 0.04) 0%, transparent 70%);
}
```
위쪽에서 아주 연한 파랑 그라디언트가 스며드는 효과.

---

## 4. 카드 / 컨테이너

### 기본 카드
```tsx
<div className="bg-white rounded-xl border border-ds-outline-variant/8 shadow-sm">
```

### 카드 헤더 바
```tsx
<div className="flex items-center justify-between px-5 py-3 border-b border-ds-outline-variant/8">
  <span className="text-[13px] font-semibold text-ds-on-surface">섹션 제목</span>
  {/* 우측 액션들 */}
</div>
```

### 카드 푸터 바
```tsx
<div className="px-5 py-2.5 border-t border-ds-outline-variant/8 bg-ds-surface-container-low/20">
  <span className="text-[11px] text-ds-on-surface-variant/60">...</span>
</div>
```

---

## 5. KPI 카드

아이콘 없이 숫자와 레이블, 필요 시 프로그레스 바로 구성한다.

```tsx
<div className="bg-white rounded-xl border border-ds-outline-variant/8 px-4 py-3.5 shadow-sm">
  <p className="text-[10px] font-semibold uppercase tracking-widest text-ds-on-surface-variant/60">
    레이블
  </p>
  <p className="text-2xl font-bold tabular-nums text-ds-on-surface mt-1.5">
    1,234
  </p>
  {/* 프로그레스 바 (선택) */}
  <div className="mt-2.5 flex items-center gap-2">
    <div className="flex-1 h-1 bg-ds-surface-container-high rounded-full overflow-hidden">
      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
    </div>
    <span className="text-[10px] font-semibold tabular-nums text-ds-on-surface-variant">{pct}%</span>
  </div>
  <p className="text-[10px] text-ds-on-surface-variant/60 mt-1">보조 설명</p>
</div>
```

- KPI 숫자 색상: 기본 `text-ds-on-surface`, 위험 `text-ds-error`, 성공 `text-emerald-600`, 진행 `text-ds-tertiary`
- 프로그레스 바 컬러: 성공/완료 `bg-emerald-500`, 정책/활성 `bg-ds-tertiary`

---

## 6. 버튼

### 기본 액션 버튼 (갱신, 새로고침 등)
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-ds-on-surface-variant bg-white rounded-lg shadow-sm border border-ds-outline-variant/10 hover:text-ds-on-surface hover:bg-ds-surface-container-low transition-all">
  <Icon className="w-3.5 h-3.5" />
  레이블
</button>
```

### 주요 액션 버튼 (추가, 저장)
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold btn-primary-gradient text-ds-on-tertiary rounded-lg shadow-sm hover:opacity-90 transition-all">
  <Plus className="w-3.5 h-3.5" />
  장비 추가
</button>
```

### 서브 버튼 (대량 등록, 템플릿 등)
```tsx
<button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-ds-on-surface-variant bg-ds-surface-container-low rounded-lg border border-ds-outline-variant/10 hover:text-ds-on-surface transition-colors">
  <Icon className="w-3 h-3" />
  레이블
</button>
```

### 아이콘 전용 버튼 (테이블 행 액션)
```tsx
<button className="p-1.5 hover:bg-ds-surface-container-high rounded-lg text-ds-on-surface-variant hover:text-ds-primary transition-colors">
  <Pencil className="w-3.5 h-3.5" />
</button>
// 삭제 버튼
<button className="p-1.5 hover:bg-red-50 rounded-lg text-ds-on-surface-variant hover:text-ds-error transition-colors">
  <Trash2 className="w-3.5 h-3.5" />
</button>
```

---

## 7. 배지 / 태그

### 벤더 배지
```tsx
// border 포함 3-tone 스타일
const VENDOR_BADGE = {
  paloalto: 'bg-orange-50 text-orange-600 border border-orange-100',
  ngf:      'bg-blue-50 text-blue-600 border border-blue-100',
  mf2:      'bg-cyan-50 text-cyan-600 border border-cyan-100',
  mock:     'bg-gray-50 text-gray-500 border border-gray-100',
}

<span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>
  PaloAlto
</span>
```

### 상태 배지 (도트 + 텍스트 방식)
```tsx
const STATUS_CONFIG = {
  success:     { label: '완료',   dot: 'bg-emerald-500',              text: 'text-emerald-700' },
  in_progress: { label: '진행중', dot: 'bg-ds-tertiary animate-pulse', text: 'text-ds-tertiary' },
  pending:     { label: '대기',   dot: 'bg-ds-outline',                text: 'text-ds-on-surface-variant' },
  failure:     { label: '실패',   dot: 'bg-ds-error',                  text: 'text-ds-error' },
  error:       { label: '오류',   dot: 'bg-ds-error',                  text: 'text-ds-error' },
}

<span className={`flex items-center gap-1.5 text-[11px] font-semibold ${conf.text}`}>
  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
  {conf.label}
</span>
```

### 그룹 / 기타 태그
```tsx
<span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-ds-tertiary/10 text-ds-tertiary">
  그룹명
</span>
```

### 수집 옵션 배지 (소형)
```tsx
<span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
  히트수집
</span>
```

### 실시간 인디케이터
```tsx
<div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
  실시간
</div>
```

---

## 8. 검색 입력창

```tsx
<div className="flex items-center gap-1.5 bg-ds-surface-container-low rounded-lg px-2.5 py-1.5 border border-ds-outline-variant/10">
  <Search className="w-3 h-3 text-ds-on-surface-variant shrink-0" />
  <input
    placeholder="검색"
    className="text-[12px] bg-transparent outline-none text-ds-on-surface placeholder:text-ds-on-surface-variant/40 w-36"
  />
  {value && (
    <button onClick={clear}>
      <XCircle className="w-3 h-3 text-ds-on-surface-variant hover:text-ds-on-surface" />
    </button>
  )}
</div>
```

---

## 9. 테이블

일반 HTML 테이블로 구현. 헤더 스타일은 AG Grid 커스텀 테마와 동일한 언어를 사용한다.

```tsx
<table className="w-full text-left border-collapse">
  <thead>
    <tr className="border-b border-ds-outline-variant/8 bg-ds-surface-container-low/30">
      <th className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-ds-on-surface-variant/60">
        컬럼명
      </th>
    </tr>
  </thead>
  <tbody className="divide-y divide-ds-outline-variant/8">
    <tr className="hover:bg-ds-surface-container-low/30 transition-colors border-l-2 border-l-transparent">
      <td className="px-5 py-3 text-[12px] text-ds-on-surface">...</td>
    </tr>
    {/* 오류 행 */}
    <tr className="border-l-2 border-l-ds-error bg-red-50/20">...</tr>
  </tbody>
</table>
```

---

## 10. AG Grid

`AgGridWrapper` 컴포넌트로 추상화. 커스텀 테마는 `index.css`의 `.ag-theme-quartz` 오버라이드로 적용.

```tsx
<AgGridWrapper
  columnDefs={COLUMN_DEFS}
  rowData={rowData}
  getRowId={(p) => String(p.data.id)}
  height={gridHeight}           // 행 수 기반 계산값
  noRowsText="데이터 없음"
  defaultColDefOverride={{ filter: false, resizable: true, sortable: true }}
  fitColumns                    // 컨테이너 너비에 맞춰 컬럼 분배
/>
```

### 그리드 높이 계산 패턴
```ts
const ROW_H = 44     // --ag-row-height
const HEADER_H = 42  // --ag-header-height + 약간의 여유
const gridHeight = rowData.length > 0
  ? Math.min(rowData.length * ROW_H + HEADER_H, 10 * ROW_H + HEADER_H)  // 최대 10행
  : 180  // 빈 상태
```

### `fitColumns` vs 기본
- `fitColumns={true}`: `sizeColumnsToFit()` — 컨테이너 너비를 꽉 채움 (대시보드처럼 컬럼 수가 많을 때)
- 기본: `autoSizeAllColumns()` — 콘텐츠 기반 너비 (컬럼 수가 적을 때)

### AG Grid 컬럼 셀 렌더러 패턴
```tsx
// 도트 상태 배지
cellRenderer: (p: { value: string | null; data: Row }) => {
  const conf = STATUS_CONFIG[p.value ?? '']
  if (!conf) return <span className="text-ds-on-surface-variant/40 text-xs">—</span>
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${conf.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${conf.dot}`} />
      {conf.label}
    </span>
  )
}

// 두 줄 셀 (장비명 + IP)
cellRenderer: (p: { data: Row }) => (
  <div className="flex flex-col justify-center leading-tight">
    <span className="text-[12px] font-semibold text-ds-on-surface">{p.data.name}</span>
    <span className="text-[10px] text-ds-on-surface-variant/60 font-mono mt-0.5">{p.data.ip}</span>
  </div>
)
```

---

## 11. 경고 배너

```tsx
<div className="flex items-center justify-between bg-ds-error/4 border border-ds-error/15 rounded-xl px-5 py-3">
  <div className="flex items-center gap-3">
    <AlertTriangle className="w-4 h-4 text-ds-error shrink-0" />
    <div>
      <p className="text-[13px] font-semibold text-ds-error">오류 제목</p>
      <p className="text-[11px] text-ds-error/60 mt-0.5">상세 설명</p>
    </div>
  </div>
  <button className="px-3 py-1.5 bg-ds-error text-white text-[12px] font-semibold rounded-lg hover:brightness-110 transition-all shrink-0">
    조치 버튼
  </button>
</div>
```

---

## 12. CSS 유틸리티 클래스

`index.css`에 정의된 커스텀 유틸리티.

| 클래스 | 용도 |
|---|---|
| `.ambient-shadow` | `box-shadow: 0 12px 32px rgba(42,52,57,0.06)` — 카드 그림자 |
| `.ambient-shadow-md` | 더 진한 그림자 |
| `.ambient-shadow-sm` | 가벼운 그림자 |
| `.ghost-border` | `border: 1px solid rgba(169,180,185,0.2)` — 얇은 구분선 |
| `.glass-panel` | `bg-white/82 backdrop-blur-xl saturate(1.4)` — 글래스모피즘 |
| `.btn-primary-gradient` | `linear-gradient(135deg, #005bc4, #004fad)` — 파랑 버튼 배경 |

> **참고**: 최근 리팩토링 이후 카드 스타일은 `.ambient-shadow` + `.ghost-border` 조합 대신  
> `shadow-sm border border-ds-outline-variant/8`로 Tailwind 유틸리티를 직접 사용하는 방향으로 통일되고 있다.

---

## 13. 드롭다운 패널 (글래스)

```tsx
<div className="absolute right-0 top-full mt-2 w-72 bg-white/90 backdrop-blur-xl rounded-xl border border-white/60 shadow-ambient-md z-50">
```

---

## 14. 아이콘 사용 원칙

- 라이브러리: `lucide-react`
- 헤더 버튼 아이콘: `w-3.5 h-3.5`
- 테이블 행 액션 아이콘: `w-3.5 h-3.5`
- 검색 / 소형 아이콘: `w-3 h-3`
- 경고 / 강조 아이콘: `w-4 h-4`
- **KPI 카드에는 아이콘을 사용하지 않는다.** 숫자와 레이블만으로 계층을 표현한다.

---

## 15. 박스 섀도

`tailwind.config.js`의 `boxShadow` 확장:

| 키 | 값 | 용도 |
|---|---|---|
| `shadow-sm` (Tailwind 기본) | — | 카드, 버튼 |
| `shadow-ambient` | `0 12px 32px rgba(42,52,57,0.06)` | 부유한 카드 |
| `shadow-ambient-md` | `0 8px 24px rgba(42,52,57,0.08)` | 드롭다운 |
| `shadow-ambient-sm` | `0 4px 12px rgba(42,52,57,0.05)` | 소형 요소 |
| `shadow-navbar` | `0 1px 0 rgba(169,180,185,0.15), 0 4px 16px rgba(42,52,57,0.06)` | Navbar 전용 |
