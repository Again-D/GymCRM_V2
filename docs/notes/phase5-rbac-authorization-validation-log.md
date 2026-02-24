# Phase 5-3 RBAC Authorization Validation Log

- Date: 2026-02-24
- Scope: Phase 5-3 (RBAC on Current APIs / Backend)

## Implemented (This Turn)

- 컨트롤러 메서드 레벨 `@PreAuthorize` 적용
  - `members`: `ROLE_CENTER_ADMIN`, `ROLE_DESK` 허용
  - `products`:
    - 조회(`list/detail`): `ROLE_CENTER_ADMIN`, `ROLE_DESK` 허용
    - 변경(`create/update/status`): `ROLE_CENTER_ADMIN`만 허용
  - `memberships`(구매/홀딩/해제/환불/환불미리보기): `ROLE_CENTER_ADMIN`, `ROLE_DESK` 허용
- `prototype` 모드 호환 유지:
  - 권한식에 `@securityModeSettings.isPrototypeMode()` 우회 조건 포함
- 메서드 시큐리티 권한 거부 예외를 `403 ACCESS_DENIED`로 매핑
  - `GlobalExceptionHandler`에 `AccessDeniedException` / `AuthorizationDeniedException` 처리 추가

## Automated Test Verification

Commands:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon --tests com.gymcrm.auth.RbacAuthorizationIntegrationTest
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon
```

Result:
- ✅ RBAC integration test PASS
- ✅ backend 전체 테스트 PASS

## RBAC Matrix Validation (Integration Test)

`RbacAuthorizationIntegrationTest`에서 확인된 사항:

- `ROLE_DESK`
  - ✅ 회원 API: 등록/수정 가능
  - ✅ 상품 API: 목록/상세 조회 가능
  - ❌ 상품 API: 등록/수정/상태변경 `403 ACCESS_DENIED`
  - ✅ 회원권 업무 API: 구매/홀딩/해제/환불미리보기/환불 가능
- `ROLE_CENTER_ADMIN`
  - ✅ 상품 등록 가능 (관리자 경로 정상)

## Bug Found During Validation (Fixed)

- 증상: `@PreAuthorize` 권한 실패가 일부 경로에서 `500`으로 떨어짐
- 원인: method security의 `AuthorizationDeniedException`이 글로벌 예외 핸들러 일반 `Exception` 경로로 처리됨
- 조치: 글로벌 예외 핸들러에 권한 거부 예외 전용 `403` 매핑 추가
- 재검증: `ROLE_DESK`의 상품 변경 금지 요청이 `403 ACCESS_DENIED`로 일관되게 반환됨

## Remaining Work (Phase 5-4+)

- 프론트 로그인/세션 상태/토큰 재발급 연동
- `DESK` 권한 실패 시 프론트 UX 메시지 정리
- `traceId` 응답/로그 상관관계 정렬
