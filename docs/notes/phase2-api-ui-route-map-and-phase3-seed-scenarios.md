# Phase 2 Review: API/UI Route Map and Phase 3 Seed Scenarios

Date: 2026-02-23
Purpose: `P2-7` checklist closure for Phase 2 review and Phase 3 handoff readiness

## 1) Member/Product API and UI Route Map

### Member
- UI Tab: `회원 관리` (single-screen admin portal section)
- Planned route reference (doc-level): `/members`, `/members/:memberId`
- Backend APIs:
  - `POST /api/v1/members` (create)
  - `GET /api/v1/members?name=&phone=` (list/search)
  - `GET /api/v1/members/{memberId}` (detail)
  - `PATCH /api/v1/members/{memberId}` (update)
- UI behavior mapping:
  - 회원 폼 submit(create mode) -> `POST /api/v1/members`
  - 회원 목록 row click -> `GET /api/v1/members/{memberId}`
  - 회원 폼 submit(edit mode) -> `PATCH /api/v1/members/{memberId}`
  - 이름/연락처 검색 -> `GET /api/v1/members`

### Product
- UI Tab: `상품 관리` (single-screen admin portal section)
- Planned route reference (doc-level): `/products`, `/products/new`
- Backend APIs:
  - `POST /api/v1/products` (create)
  - `GET /api/v1/products?category=&status=` (list/filter)
  - `GET /api/v1/products/{productId}` (detail)
  - `PATCH /api/v1/products/{productId}` (update)
  - `PATCH /api/v1/products/{productId}/status` (status toggle)
- UI behavior mapping:
  - 상품 폼 submit(create mode) -> `POST /api/v1/products`
  - 상품 목록 row click -> `GET /api/v1/products/{productId}`
  - 상품 폼 submit(edit mode) -> `PATCH /api/v1/products/{productId}`
  - 상태 토글 버튼 -> `PATCH /api/v1/products/{productId}/status`
  - 카테고리/상태 필터 조회 -> `GET /api/v1/products`

## 2) Phase 3 Seed Scenarios (Membership Purchase/Hold/Refund 준비용)

### Required baseline data set (single center)
- Center: seeded (`center_id=1`, Prototype Center)
- Members: 최소 2명
  - `ACTIVE` 회원 1명 (구매/홀딩/환불 happy path)
  - `INACTIVE` 회원 1명 (구매 제한/정책 검증 시나리오용)
- Products: 최소 3개
  - 기간제(`DURATION`) 활성 상품 1개 (헬스/멤버십)
  - 횟수제(`COUNT`) 활성 상품 1개 (PT/GX)
  - 비활성 상품 1개 (구매 불가 검증용)

### Recommended creation path (current prototype)
- Use Phase 2 admin UI for seed creation (preferred for demo rehearsal)
- Fallback: Phase 2 member/product APIs directly (scripts/curl)

### Phase 3 test scenarios enabled by this seed set
- Purchase (duration product) success -> membership + payment rows created
- Purchase (count product) success -> remaining count initialized
- Purchase blocked for inactive product
- Hold success on active duration membership
- Hold rejection when hold policy exceeded
- Resume success (hold end)
- Refund success -> membership/payment status transitions + refund record

## 3) Backlog / Deferred Items from Phase 2
- UI delete actions for members/products (out of current prototype scope)
- Router-based multi-page navigation (`React Router`) (single-screen tab UI로 대체)
- Frontend automated tests (UI integration/E2E) not yet added
- CORS configuration docs (`README`/local-run note) not yet backfilled after UI validation-discovered fix
- `P2-6` screenshots/upload workflow not executed (no PR flow in local non-git workspace)

## Handoff Notes for Phase 3
- Phase 2 UI/API is sufficient to prepare seed members/products interactively before membership flows
- Product policy fields are persisted/readable and surfaced in UI detail, enabling hold/refund rule implementation references
- Backend dev CORS is enabled only in `dev/staging` via `PrototypeCorsConfig` for local frontend integration
