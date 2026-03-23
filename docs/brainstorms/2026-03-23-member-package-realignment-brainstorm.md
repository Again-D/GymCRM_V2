---
date: 2026-03-23
topic: member-package-realignment
---

# Member Package Realignment

## What We're Building
`member` 백엔드 모듈을 [02_시스템_아키텍처_설계서.md](/Users/abc/projects/GymCRM_V2/docs/02_%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%95%84%ED%82%A4%ED%85%8D%EC%B2%98_%EC%84%A4%EA%B3%84%EC%84%9C.md)의 목표 패키지 구조에 가깝게 점진 정렬한다.

이번 1차 범위는 단순 폴더 이동이 아니라 `controller/service/repository/entity/dto/enums` 구조 재배치와 `memberStatus`, `gender`의 Java enum 전환을 포함한다. 다만 DB 컬럼은 기존처럼 문자열 저장을 유지해 마이그레이션 리스크를 줄인다.

## Why This Approach
전체 백엔드를 한 번에 정렬하는 것은 영향 범위가 너무 크다. `member` 모듈은 파일 수가 상대적으로 통제 가능하고 최근 변경 흐름과도 연결되어 있어 첫 기준 모듈로 적합하다.

엄격 정렬을 선택한 이유는 이후 `trainer`, `reservation`로 확장할 때 재사용 가능한 패턴을 먼저 확정하기 위해서다. 대신 DB enum 마이그레이션은 제외해 구조와 타입 안정성 개선에 집중한다.

## Key Decisions
- `member`를 첫 정렬 대상 모듈로 선택: 규모가 통제 가능하고 파급 범위를 관리하기 쉽다.
- 패키지 구조를 `controller/service/repository/entity/dto/enums`로 재배치: 설계서 방향과 실제 코드 간 차이를 줄인다.
- `MemberController` 내부 request/response record를 DTO 파일로 분리: 계층 역할을 명확히 하고 이후 모듈에도 동일 규칙을 적용할 수 있게 한다.
- `memberStatus`, `gender`를 Java enum으로 전환: 문자열 기반 검증보다 타입 안전성을 높인다.
- DB 저장 형식은 문자열 유지: 스키마 변경 없이 Java 레벨에서만 enum을 적용해 위험을 줄인다.
- 완료 기준에 문서화 포함: 이후 `trainer`, `reservation` 정렬 시 재사용할 기준을 남긴다.

## Resolved Questions
- 첫 정렬 대상은 `member`로 시작한다.
- 1차 범위는 엄격 정렬로 잡는다.
- DTO 분리는 이번 작업에 포함한다.
- enum 전환은 실제 적용하되 DB는 문자열 저장을 유지한다.
- 완료 시 다음 모듈에 적용할 수 있는 기준 문서화까지 함께 진행한다.

## Open Questions
- 없음

## Next Steps
→ `/prompts:workflows-plan`으로 구현 계획 수립
