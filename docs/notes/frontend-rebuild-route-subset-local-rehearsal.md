# Frontend Rebuild Route Subset Local Rehearsal

Date: 2026-03-13

## Purpose

이 문서는 `controlled route subset evaluation`을 시작하기 전에 수행한 local rehearsal 결과를 durable reference로 남긴다.

이번 실행은 실제 staging이 아니라 다음 구성으로 수행했다.

- baseline URL: `http://127.0.0.1:5173`
- rebuild URL: `http://127.0.0.1:5175`
- backend URL: `http://127.0.0.1:8080`

## Environment Notes

backend health 확인 결과:

- `securityMode: prototype`
- `prototypeNoAuth: true`

즉 이번 실행은 `staging profile smoke`가 아니라, 실제로는 baseline/rebuild alternate entry를 비교하는 `prototype-no-auth local rehearsal`이었다.

이 점 때문에 role-based auth parity 증거는 이번 문서의 범위가 아니다. 이 문서의 목적은 아래 두 가지다.

1. baseline/rebuild 4개 route를 같은 절차로 열어 비교 가능한지 확인
2. rebuild alternate entry를 열어도 baseline default entry가 전혀 흔들리지 않는지 확인

## Routes Evaluated

- `/members`
- `/memberships`
- `/reservations`
- `/access`

## Observed Result

### Baseline

- `/members`: 정상 진입
- `/memberships`: 상단 shell link로 진입 가능
- `/reservations`: 상단 shell link로 진입 가능
- `/access`: 상단 shell link로 진입 가능

### Rebuild

- `/members`: 정상 진입
- `/memberships`: shell route로 정상 진입
- `/reservations`: shell route로 정상 진입
- `/access`: shell route로 정상 진입

## Screenshots

### Baseline

- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-members-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-memberships-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-reservations-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-baseline-access-local.png`

### Rebuild

- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-members-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-memberships-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-reservations-local.png`
- `/Users/abc/projects/GymCRM_V2/docs/testing/artifacts/route-subset-rebuild-access-local.png`

## Decision

이번 local rehearsal 기준 판단:

- `Proceed`: 예
- 이유:
  - baseline과 rebuild가 별도 URL에서 독립적으로 열렸다
  - 4개 route 모두 rebuild alternate entry에서 접근 가능했다
  - baseline default entry는 그대로 유지됐다

## Limits

이번 문서는 다음을 증명하지 않는다.

- real auth/session parity
- live role restriction parity
- real internal-only deployment behavior

즉 이 결과는 `controlled route subset evaluation`의 사전 rehearsal evidence로만 사용한다.

## Related References

- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-input-sheet.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-execution-procedure.md`
- `/Users/abc/projects/GymCRM_V2/docs/notes/frontend-rebuild-route-subset-cutover-decision.md`
