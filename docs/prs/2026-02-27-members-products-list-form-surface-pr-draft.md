## Summary

- Members/Products 탭을 2열 split-view(목록+폼 동시 노출)에서 목록 우선 구조로 변경
- 등록/수정 폼을 공통 오버레이 surface(`OverlayPanel`)로 분리
- `App.tsx`에서 members/products 폼 open/close 상태를 명시적으로 관리
- 탭 전환 시 오버레이 자동 close 처리
- mobile(<=800px)에서 오버레이를 full-screen 스타일로 전환

## Scope / Non-Scope

- In scope: members/products UI surface 구조 리팩터링, overlay 접근성 기본 동작(ESC/backdrop close), 권한 UI 정합성 유지
- Out of scope: backend API/권한 정책 변경, route 기반 페이지 분리, memberships/reservations 탭 구조 변경

## Testing

### Automated

- `npm run build` (frontend) ✅

### Manual Regression (Executed on 2026-02-27)

- [x] login / logout
- [x] members: 목록 진입 -> 신규 등록 오버레이 오픈/닫기
- [x] members: 목록 행 선택 -> 수정 오버레이 오픈
- [x] products: 목록 행 선택 -> 수정 오버레이 오픈
- [x] products: `ROLE_DESK`에서 신규 등록 disabled + 오버레이 필드/저장 disabled

### Manual Notes

- DESK 계정 로그인 검증을 위해 로컬 dev DB에서 `desk-user` 비밀번호를 `center-admin`과 동일 hash로 맞춘 후 테스트함(로컬 환경 한정)
- members/products 탭에서 목록 영역이 단일 컬럼으로 확보되어 기존 split-view 대비 가독성 개선 확인

## Post-Deploy Monitoring & Validation

- No additional operational monitoring required: frontend-only UI surface refactor with no backend/API contract changes.

## Screenshots

### Members - Create Form Overlay

![members-overlay](https://raw.githubusercontent.com/Again-D/GymCRM_V2/codex/feat-members-products-form-surface/docs/prs/assets/2026-02-27-members-form-overlay.png)

### Products - Edit Overlay (Center Admin)

![products-overlay-admin](https://raw.githubusercontent.com/Again-D/GymCRM_V2/codex/feat-members-products-form-surface/docs/prs/assets/2026-02-27-products-form-overlay-center-admin.png)

### Products - Edit Overlay Disabled (Desk)

![products-overlay-desk](https://raw.githubusercontent.com/Again-D/GymCRM_V2/codex/feat-members-products-form-surface/docs/prs/assets/2026-02-27-products-form-overlay-desk-disabled.png)

## Post-Deploy Checklist

- [x] Plan status updated to `completed`
- [x] Plan checklist updated
- [x] Build + manual regression executed
