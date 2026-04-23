# FAT 개선 작업 목록

개선 계획 원본: `.claude/plans/polished-skipping-allen.md`

## 상태 범례

| 기호 | 의미 |
|------|------|
| `[ ]` | 미완 |
| `[~]` | 진행 중 |
| `[x]` | 완료 |

---

## Sprint 1 — 버그 수정 ✅

| ID | 상태 | 내용 | 파일 |
|----|------|------|------|
| P1-1 | `[x]` | WebSocket `getRowId` 미설정 → 동기화 실시간 미반영 | `pages/devices.js` |
| P1-2 | `[x]` | 객체명→정책 검색 기능 구현 (백엔드 name 검색 + 모달 버튼 + URL 라우팅) | `crud_policy.py`, `schemas/policy.py`, `objectDetailModal.js`, `policies.js`, `objects.js`, `policies.html` |
| P4-1 | `[x]` | 알림 ticker 겹침 수정 (innerHTML 초기화, double rAF) | `utils/notificationTicker.js` |

---

## Sprint 2 — 핵심 UX 개선

| ID | 상태 | 내용 | 파일 |
|----|------|------|------|
| P2-1 | `[x]` | 정책 검색 통합 — SQL-like 쿼리 빌더 (조건 행 추가/삭제 UI) | `policies.html`, `policies.js`, `firewall_query.py`, `crud_policy.py` |
| P2-2 | `[x]` | 정책/오브젝트 그리드에 방화벽명 컬럼 표시 | 이미 구현됨 (`device_name` 컬럼 pinned) |
| P2-3 | `[x]` | 설정에서 정책삭제 워크플로우 탭 제거 | `settings.html`, `settings.js` |
| P2-4 | `[x]` | 활동 로그 검색창 + 날짜 범위 필터 추가 | `settings.html`, `settings.js`, `crud_notification_log.py`, `notifications.py` |
| P4-3 | `[x]` | 오브젝트 그리드 description 컬럼 `flex:1`로 빈 공간 채움 | `objects.js` |

---

## Sprint 3 — 설정 고도화 + 계정 관리

| ID | 상태 | 내용 | 파일 |
|----|------|------|------|
| P3-3 | `[x]` | 설정 → 계정 관리 탭 CRUD (목록·생성·비밀번호 변경·활성화·삭제) | `endpoints/users.py`, `crud/__init__.py`, `api.py`, `settings.html`, `settings.js`, `api.js` |
| P3-4 | `[x]` | 활동 로그에 계정 정보 연동 (`user_id`, `username` 컬럼 추가) | `models/notification_log.py`, Alembic 마이그레이션, `notifications.py`, `settings.js` |
| P3-5 | `[x]` | 활동 로그 자동 정리 (보존 기간 설정, 스케줄러 job) | `scheduler.py`, `settings.html`, `settings.js` |
| P3-6 | `[x]` | 위험 포트 설정 UI 개선 (JSON textarea → 테이블 CRUD) | `settings.html`, `settings.js`, `risky_ports.py` |

---

## Sprint 4 — 장비 관리 + 대시보드

| ID | 상태 | 내용 | 파일 |
|----|------|------|------|
| P3-1 | `[x]` | 장비 그룹 속성 추가 + 장비 선택 드롭다운 그룹별 필터링 | `models/device.py`, `schemas/device.py`, Alembic, `devices.html`, `devices.js`, `policies.js` |
| P3-2 | `[x]` | 장비 그리드 정보 확장 (HA Peer IP, SSH 수집, 마지막 히트 수집, 그룹) | `devices.js` |
| P3-7 | `[x]` | 대시보드 개선 (장비 현황 그리드 검색창, 객체 통계 분리) | `dashboard.html`, `dashboard.js`, `crud_device.py`, `schemas/device.py` |

---

## Sprint 5 — 부가 기능

| ID | 상태 | 내용 | 파일 |
|----|------|------|------|
| P4-2 | `[x]` | 사이드바 레이아웃 전환 + 접기 기능 | `index.html`, `layout.css`, `main.js` |
| P4-4 | `[ ]` | 분석 스케줄링 (정기 분석 자동 실행) | `scheduler.py`, `SyncSchedule` 모델 확장 |
| P4-5 | `[x]` | 정책 변경 이력 시각화 (ChangeLog 기반 배지) | `policies.js`, `api.js`, `firewall_query.py` |
| P4-6 | `[ ]` | NAT 정책 지원 (벤더별 수집 레이어 신규 개발) | 별도 기획 후 진행 |

---

## 추가 제안 (사용자 요청 외)

| ID | 상태 | 내용 |
|----|------|------|
| EX-1 | `[x]` | 정책 변경 이력 비교 — 배지 클릭 시 before/after diff 모달 + 주차별 통계 API |
| EX-2 | `[ ]` | 오브젝트 페이지 고급필터 추가 |
| EX-3 | `[ ]` | 분석 완료 시 브라우저 알림 (Web Notification API) |
| EX-4 | `[ ]` | 장비 연결 테스트 버튼 그리드 내 추가 |

---

> 작업 시작 시 상태를 `[~]`로, 완료 시 `[x]`로 변경하세요.
