# Phase 2 Admin Portal UI Validation Log

Date: 2026-02-23
Scope: `P2-6 관리자 포털 UI (회원/상품)` 완료 기준 검증
Method: `agent-browser` headless automation against local `frontend(5173)` + `backend(8080)` + `postgres(5433)`

## Environment
- Docker PostgreSQL: `gymcrm-postgres` (`5433 -> 5432`, healthy)
- Backend: Spring Boot `dev` profile (`8080`)
- Frontend: Vite dev server (`5173`)

## Pre-check issue found and fixed during validation
- Symptom: browser snapshot showed `Failed to fetch` in member list panel
- Cause: backend CORS not configured for `http://127.0.0.1:5173`
- Fix: added `PrototypeCorsConfig` (`dev/staging` only) for `/api/v1/**`, allowed origins configurable via `app.prototype.allowed-origins`

## Member UI Validation (Pass)
- Created member via UI form
  - `memberName=UI회원B`
  - `phone=010-9000-2222`
- Verified list row added in table
- Verified detail panel auto-loaded after create
- Verified Phase 3 membership placeholder section visible in member detail
- Updated member via UI form
  - `memberName=UI회원B-수정`
  - `memberStatus=INACTIVE`
- Verified list/detail reflected updated values
- Verified duplicate phone error display in UI
  - attempted new member with existing phone `010-9000-2222`
  - UI error message rendered: conflict + duplicate phone detail

## Product UI Validation (Pass)
- Verified client-side policy validation message
  - switched product type to `COUNT`
  - cleared `totalCount`
  - submit blocked with UI error message: `횟수제 상품은 총 횟수를 입력해야 합니다.`
- Created product via UI form
  - `productName=UI상품C-1623`
  - `productType=COUNT`
  - `priceAmount=123000`
  - `totalCount=12`
- Verified list row added and detail panel auto-loaded after create
- Updated product via UI form
  - `productName=UI상품C-1623-수정`
  - `priceAmount=129000`
- Toggled product status via UI action button
  - `ACTIVE -> INACTIVE`
- Verified list/detail/form state all reflected updated values

## Conclusion
- `P2-6` 완료 기준 충족: 데모에서 UI 통해 회원/상품 CRUD(생성/조회/수정 + 상품 상태변경) 수행 가능
- Residual note: delete 기능은 현재 프로토타입 범위 외이며 Phase 2 체크리스트 항목에도 없음
