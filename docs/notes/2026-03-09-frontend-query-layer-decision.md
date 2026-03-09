# Frontend Query Layer Decision

- Date: 2026-03-09
- Scope: `App.tsx` state ownership / query lifecycle refactor follow-up
- Decision: **Keep the current `apiGet/apiPost/apiPatch` client and add targeted hooks/helpers first. Do not introduce SWR app-wide yet.**

## Why

현재 프론트엔드는 인증 refresh dedupe를 `/Users/abc/projects/GymCRM_V2/frontend/src/shared/api/client.ts`에서 이미 처리하고 있다. 하지만 도메인 query는 아직 “공유 원격 상태”보다 “화면 로컬 상태 + reset 규칙” 성격이 강하다.

특히 아래 화면은 form/reset 정책과 fetch lifecycle이 강하게 결합돼 있다.

- `회원권 업무`
- `예약 관리`
- `출입 관리`

이 시점에서 SWR를 전면 도입하면 얻는 것보다 바꿔야 하는 수명 정책과 reset 경계가 더 많다. 먼저 `App.tsx` 상태 집중을 줄이고, workspace/local query를 훅 단위로 분리하는 것이 안전하다.

## Decision Gate Result

### Keep local hooks/helpers for now

- `workspace member picker search`
  - 이유: workspace-local transient query
  - 현재 조치: debounce + cache + in-flight dedupe + invalidation helper

- `reservation schedules`
  - 이유: reservations workspace에 가깝고 form state와 함께 움직임
  - 권장: 필요 시 next step에서 workspace hook으로 분리

- `access events / presence`
  - 이유: refresh/reset 정책이 화면 액션과 밀접함
  - 권장: state ownership 정리 후 재평가

### Candidate for future shared query layer

- `products list`
  - 여러 surface에서 공유 가능성이 높고 stale/reload 정책이 비교적 단순함

- `member summary list`
  - members workspace와 direct-entry 흐름 간 공유 가능성은 있지만, 아직 invalidation 정책이 정리 중이므로 당장은 보류

## Trigger to Revisit SWR

아래 조건이 2개 이상 만족되면 SWR 또는 유사 query layer를 다시 검토한다.

- 같은 endpoint를 여러 화면이 공유한다.
- 같은 데이터에 대해 stale/revalidation 정책이 반복 구현된다.
- loading/error 표현이 여러 화면에서 중복된다.
- background revalidation 가치가 명확하다.

## Immediate Next Step

1. `workspace member search` invalidate 정책 유지
2. profiler로 re-render hotspot 확인
3. reservations 또는 access 상태 묶음을 custom hook으로 분리
4. 이후에도 query duplication이 계속 보이면 SWR 시범 도입 범위를 재정의
