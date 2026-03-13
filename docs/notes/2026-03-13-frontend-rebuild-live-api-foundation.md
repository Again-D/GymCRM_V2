# frontend rebuild live api foundation

## Summary

Phase 1의 첫 단위로 `frontend-rebuild`가 mock/runtime preset 전용 앱이 아니라, live backend contract를 탈 수 있는 기본 wiring을 갖추도록 정리했다.

이번 단계에서 닫은 것:
- mock mode와 live mode를 API client 레벨에서 분리
- live mode에서 `/api/v1/health` + `/api/v1/auth/refresh` bootstrap 지원
- live mode에서 `/api/v1/auth/login`, `/api/v1/auth/logout` 경로 지원
- 로그인 화면과 shell sidebar가 mock preset UI와 live auth UI를 구분해서 렌더

## Runtime Contract

### Mock mode

- 활성 조건:
  - `VITE_REBUILD_MOCK_DATA=1`
  - test environment
- 동작:
  - 기존 runtime auth preset 사용
  - mock data source 사용
  - `prototype-admin`, `jwt-anon`, `jwt-admin`, `jwt-trainer` preset 유지

### Live mode

- 활성 조건:
  - `VITE_REBUILD_MOCK_DATA`가 설정되지 않았거나 `1`이 아님
- API target:
  - same-origin `/api/...`
  - dev server에서는 Vite proxy가 backend로 전달
  - 필요 시 `VITE_REBUILD_API_BASE_URL` 또는 `VITE_DEV_PROXY_TARGET` 사용
- 동작:
  - `/api/v1/health`로 security mode 확인
  - JWT mode면 `/api/v1/auth/refresh`로 세션 복구 시도
  - `/login`에서 실제 `/api/v1/auth/login` 호출
  - shell sidebar에서 실제 `/api/v1/auth/logout` 호출

## Current Limit

이번 단계는 live API parity의 기반만 닫았다.

아직 남은 것:
- members / memberships / reservations / access를 live backend 기준으로 end-to-end smoke
- live mode blocker log 작성
- role parity matrix 작성
- runtime auth preset과 live evidence를 문서에서 더 분명히 분리

## Validation

- `npm test -- --run src/app/auth.test.tsx src/App.routing.test.tsx`
- `npm run build`

둘 다 통과했다.
