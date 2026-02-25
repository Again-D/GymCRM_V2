---
module: Gym CRM Admin Portal Frontend
date: 2026-02-25
problem_type: ui_bug
component: frontend
symptoms:
  - "관리자 포털 기능이 단일 화면에 과밀하게 배치되어 회원권 업무(구매/홀딩/해제/환불) 탐색이 어려웠다"
  - "JWT 로그인 도입 이후에도 운영형 포털 정보구조(사이드바/업무 영역) 없이 프로토타입 단일 화면 형태가 유지되었다"
  - "모바일 좁은 화면에서 레이아웃 안정성 확인이 필요했다"
root_cause: information_architecture_debt
resolution_type: ui_refactor
severity: medium
tags: [frontend, ui, information-architecture, sidebar-shell, jwt-login, responsive]
---

# Troubleshooting: Admin Portal Single-Page UI Density → Sidebar Workspace Reorg (Login-First)

## Problem

관리자 포털의 핵심 기능은 동작했지만, 화면 구조가 `App.tsx` 단일 페이지 중심으로 과밀하게 구성되어 있었다. 특히 회원권 업무(구매/홀딩/해제/환불)가 회원 상세 내부에 섞여 있어 탐색성이 떨어졌고, Phase 5에서 JWT/RBAC를 도입한 뒤에도 운영형 포털 UX로 정리되지 않았다.

## Environment

- Module: Gym CRM Admin Portal Frontend
- Affected Component: `frontend/src/App.tsx`, `frontend/src/styles.css`
- Date: 2026-02-25

## Symptoms

- 상단 탭 중심 구조에서 업무 흐름이 화면 내부 깊숙이 숨겨져, 데모/운영 시 “어디서 처리하는지” 설명 비용이 큼
- 회원 CRUD와 회원권 업무 UI가 같은 상세 패널에 섞여 정보 밀도 과다
- JWT 로그인 후에도 “운영 포털” 느낌보다 “단일 프로토타입 화면” 느낌이 강함
- 모바일(좁은 화면)에서 레이아웃이 깨질 가능성에 대한 검증 부재

## What Didn't Work

**Attempted Approach 1:** 기존 단일 화면 구조를 유지한 채 스타일만 폴리시
- **Why it failed:** 시각 개선만으로는 정보구조 문제(회원 vs 회원권 업무 분리 부족)가 해결되지 않았다.

**Attempted Approach 2:** 회원 상세 내부에 안내 문구만 추가
- **Why it failed:** 실제 액션 위치가 그대로라 탐색성/업무 동선 개선 효과가 제한적이었다.

## Solution

UI를 기능 추가 없이 **사이드바 기반 워크스페이스 구조**로 재배치하고, JWT 모드에서는 **로그인 우선 진입 UX**를 유지한 채 운영형 화면으로 정리했다.

### 1) 정보구조(IA) 재구성: Sidebar Workspaces

사이드바 탭을 기준으로 최소 업무 단위를 분리:

- `대시보드`
- `회원 관리`
- `회원권 업무`
- `상품 관리`

핵심 변경:
- 회원권 구매/홀딩/해제/환불/결제이력 UI를 `회원권 업무` 탭으로 이관
- `회원 관리 > 회원 상세`에는 요약 정보 + `회원권 업무 탭 열기` CTA만 유지

파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

### 2) JWT 로그인 우선 진입 구조 유지/정리

- `jwt` 모드 미인증 상태: 로그인 화면만 노출
- 인증 후: 사이드바 기반 관리자 포털 셸 진입
- `securityMode === "unknown"` 전용 오류 화면 유지 (보호 UI 오노출 방지)

파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

### 3) 권한 UX 정렬 (`ROLE_DESK` 상품 변경 제한)

백엔드 RBAC와 일관되게 프론트에서 상품 변경 UI를 제한:

- `신규 등록` 버튼 disabled
- 상품 수정/상태 토글 disabled
- 상품 폼 `fieldset` disabled
- 안내 문구 표시

파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/App.tsx`

### 4) 테마/배경/반응형 레이아웃 정리

- 배경 컬러/레이어를 차분한 톤으로 재정리
- 사이드바/콘텐츠 패널 계층감 강화
- 좁은 화면에서 2컬럼 → 1컬럼 전환, 사이드바 `sticky` 해제, 네비게이션 그리드 재배치

파일:
- `/Users/abc/projects/GymCRM_V2/frontend/src/styles.css`

## Why This Works

1. **정보구조 분리로 인지 부하 감소**
   - 회원 CRUD와 회원권 업무를 화면/탭 단위로 분리해 탐색 비용이 줄었다.

2. **도메인 정책과 UI 위치가 정렬됨**
   - `HOLDING 환불 불가` 같은 정책 가드를 별도 `회원권 업무` 화면에서 더 명확하게 유지할 수 있다.

3. **JWT 운영 흐름과 포털 셸이 일관됨**
   - 로그인 화면 → 앱 셸 → 업무 탭 진입 구조가 명확해져 운영형 UX에 가까워졌다.

4. **모바일 “사용 가능” 수준의 안정성 확보**
   - 모바일 퍼스트까지는 아니지만, 좁은 화면에서 깨지지 않도록 기본 반응형을 확보했다.

## Prevention

- **스타일 개선 전에 IA 문제를 먼저 분리 판단**: “어디서 기능을 찾는가” 문제가 있으면 레이아웃/탭 구조부터 재설계
- **정책 UI는 관련 업무 화면에 배치**: 회원권 정책 가드(예: HOLDING 환불 제한)는 회원권 업무 화면에 집중 유지
- **권한 UX는 백엔드 RBAC와 함께 점검**: disabled/안내 문구가 백엔드 `403`과 모순되지 않도록 브라우저 검증 포함
- **UI 리팩터링에도 검증 로그 남기기**: JWT 핵심 E2E + 모바일 렌더 + 권한 UX를 문서화
- **포트/CORS 검증 조건 기록**: 로컬 Vite 포트 변경 시 CORS로 로그인 실패할 수 있으므로 검증 로그에 포트 조건 명시

## Commands run

```bash
# Frontend build
cd /Users/abc/projects/GymCRM_V2/frontend
npm run build

# Browser validation (JWT, sidebar shell)
/Users/abc/projects/GymCRM_V2/.tooling/bin/agent-browser ...

# Backend/Frontend local validation endpoints (running servers)
curl -s -D - http://127.0.0.1:8084/api/v1/health
curl -s -D - http://127.0.0.1:5173/
```

## Validation Evidence

- `/Users/abc/projects/GymCRM_V2/docs/notes/phase6-sidebar-shell-ui-validation-log.md`
- `/Users/abc/projects/GymCRM_V2/docs/plans/2026-02-24-feat-phase6-frontend-sidebar-shell-and-login-first-ui-plan.md`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase6-mobile-members-view.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/phase6-mobile-products-view.png`
- PR #2: [feat(frontend): reorganize admin portal into sidebar workspaces](https://github.com/Again-D/GymCRM_V2/pull/2)

## Related Issues

- `/Users/abc/projects/GymCRM_V2/docs/solutions/database-issues/membership-hold-refund-state-integrity-gymcrm-20260224.md` (회원권 정책/UI 가드 정렬 관련 선행 교훈)

