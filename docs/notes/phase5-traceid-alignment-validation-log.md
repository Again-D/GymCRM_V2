# Phase 5-5 TraceId Alignment Validation Log

- Date: 2026-02-24
- Scope: Phase 5-5 (Traceability & Response Standard Alignment)

## Implemented

- `TraceIdFilter` 추가
  - 요청 헤더 `X-Trace-Id` 수신 시 재사용, 없으면 생성
  - 응답 헤더 `X-Trace-Id` echo
  - MDC(`traceId`) 저장/정리
- `ApiResponse`에 `traceId` 필드 추가
  - 성공/실패 응답 모두 포함
- 로깅 패턴 정렬
  - 로그 레벨 패턴에 `[traceId:%X{traceId:-none}]` 포함
- 프론트 API 에러 객체에 `traceId` 전달
  - `ApiClientError.traceId`
  - UI 에러 메시지 포맷에 `[traceId: ...]` 부착

## Build / Test Verification

Commands:

```bash
cd /Users/abc/projects/GymCRM_V2/backend
GRADLE_USER_HOME=/Users/abc/projects/GymCRM_V2/.gradle-local ./gradlew test --no-daemon

cd /Users/abc/projects/GymCRM_V2/frontend
npm run build
```

Result:
- ✅ Backend tests PASS
- ✅ Frontend build PASS

## Runtime Verification (dev + jwt)

Runtime setup:
- Backend: `SPRING_PROFILES_ACTIVE=dev`, `APP_SECURITY_MODE=jwt`, `PORT=8084`
- DB: Docker PostgreSQL (`localhost:5433`)

### 1) Success Response TraceId (health)

Request:
- `GET /api/v1/health`
- Header: `X-Trace-Id: trace-success-555`

Verified:
- ✅ Response header `X-Trace-Id: trace-success-555`
- ✅ Response body `traceId = "trace-success-555"`

### 2) Error Response TraceId (malformed JSON)

Preparation:
- `POST /api/v1/auth/login` with `center-admin / dev-admin-1234!` to get access token

Request:
- `POST /api/v1/samples/validate`
- Header: `X-Trace-Id: trace-malformed-999`
- Header: `Authorization: Bearer <accessToken>`
- Malformed JSON body (`{"name":`)

Verified:
- ✅ HTTP `500` returned (handled by `GlobalExceptionHandler`)
- ✅ Response header `X-Trace-Id: trace-malformed-999`
- ✅ Response body `traceId = "trace-malformed-999"`
- ✅ Error payload preserved common envelope with `INTERNAL_ERROR`

### 3) Log Correlation by TraceId

Observed backend log line:

- `ERROR [traceId:trace-malformed-999] ... GlobalExceptionHandler : Unhandled exception`

Verified:
- ✅ Same `traceId` is present in request header, error response body/header, and server log

## Notes

- 로컬 포트 접근은 현재 환경 특성상 격상 권한 실행으로 검증함.
- `userId` MDC 추가는 이번 범위에 포함하지 않았고, `traceId` 기반 상관관계만 우선 정렬함.
