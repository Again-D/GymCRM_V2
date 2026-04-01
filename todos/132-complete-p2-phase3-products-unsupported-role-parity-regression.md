---
status: complete
priority: p2
issue_id: "132"
tags: [code-review, frontend, auth, products, phase3]
dependencies: []
---

# Restore products unsupported-role parity

## Problem Statement

상품 화면의 unsupported-role 안내 계약이 phase3에서 바뀌어 trainer/live 모드 parity가 깨졌다.

## Findings

- [`/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx:293`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx#L293)~[`:299`](/Users/abc/projects/GymCRM_V2/frontend/src/pages/products/ProductsPage.tsx#L299)에서 안내 문구가 기존 명시적 거부 메시지 대신 더 일반적인 경고 문구로 바뀌었다.
- focused test `npx vitest run src/pages/products/ProductsPage.test.tsx`가 `"현재 권한에서는 상품 정보를 조회할 수 없습니다."` 문구를 찾지 못해 실패한다.
- workdoc phase3 gate의 `auth/session parity` 기준과 충돌한다.

## Proposed Solutions

### Option 1: Restore previous unsupported-role copy

**Approach:** trainer/live 기준의 명시적 제한 문구를 복원한다.

**Pros:**
- 기존 계약과 테스트를 바로 복구한다.
- 권한 제한 의미가 더 명확하다.

**Cons:**
- 새 카피 방향을 일부 되돌린다.

**Effort:** 30-60 minutes

**Risk:** Low

---

### Option 2: Intentionally redefine the contract and update all dependents

**Approach:** 새 문구를 공식 계약으로 채택하고 테스트/문서/관련 화면을 모두 갱신한다.

**Pros:**
- phase3 톤 앤 매너를 유지할 수 있다.

**Cons:**
- parity 유지 목표와 충돌할 수 있다.
- 변경 범위가 불필요하게 커진다.

**Effort:** 2-3 hours

**Risk:** Medium

## Recommended Action

## Technical Details

**Affected files:**
- `frontend/src/pages/products/ProductsPage.tsx`
- `frontend/src/pages/products/ProductsPage.test.tsx`

## Resources

- `cd frontend && npx vitest run src/pages/products/ProductsPage.test.tsx`

## Acceptance Criteria

- [x] unsupported-role 사용자가 기존 계약과 동일한 제한 문구를 본다.
- [x] unsupported-role 상태에서 불필요한 live action contract가 노출되지 않는다.
- [x] Products focused tests가 다시 통과한다.

## Work Log

### 2026-03-30 - Initial Discovery

**By:** Codex

**Actions:**
- Products focused vitest 실행
- unsupported-role 경고 문구 변경 지점 확인

**Learnings:**
- 단순 copy 변경도 권한/세션 parity gate를 쉽게 깨뜨린다.

### 2026-03-30 - Implemented

**By:** Codex

**Actions:**
- `ProductsPage.tsx`의 unsupported-role 안내 문구를 기존 명시적 제한 카피로 복원
- 필터 버튼 텍스트 계약도 이전 기대값에 맞게 정리
- `cd frontend && npx vitest run src/pages/products/ProductsPage.test.tsx`로 parity 회귀 확인

**Learnings:**
- unsupported-role surface는 tone 조정보다 기존 auth contract 유지가 우선이다.
