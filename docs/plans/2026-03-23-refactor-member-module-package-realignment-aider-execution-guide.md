# Member Module Package Realignment Aider Execution Guide

이 문서는 [2026-03-23-refactor-member-module-package-realignment-plan.md](/Users/abc/projects/GymCRM_V2/docs/plans/2026-03-23-refactor-member-module-package-realignment-plan.md)를 `aider`에서 로컬 `ollama`의 `qwen2.5-coder:3b-4k` 같은 소형 모델로 수행할 수 있도록 배치 단위로 쪼갠 실행 가이드다.

## 운영 규칙
- 한 번에 전체 `member` 모듈을 맡기지 않는다.
- 한 호출당 수정 파일은 가능하면 `3~6개` 이내로 제한한다.
- 각 호출은 하나의 목표만 갖는다.
- 각 호출 뒤에는 바로 컴파일 또는 테스트 한 가지로만 검증한다.
- 모델에게 “새 구조를 유지하되 기존 API 계약은 바꾸지 말라”는 제약을 반복해서 준다.
- 매 배치마다 플랜 전체 대신 해당 배치 섹션만 컨텍스트로 준다.
- 저장소 통합은 `MemberRepository` 클래스를 유지하는 방향으로만 진행한다. Spring Data custom repository 패턴으로 전면 전환하지 않는다.

## 권장 실행 순서
1. 패키지/빈 파일 생성만 먼저 처리
2. controller DTO 분리만 처리
3. service summary/내부 record 분리만 처리
4. entity/repository 패키지 이동만 처리
5. repository 3종을 `Jpa + QueryDSL + facade` 역할로 정리
6. QueryDSL clean regeneration 및 compile
7. enum 추가와 request/response binding만 처리
8. repository/entity enum boundary만 처리
9. 테스트 보강만 처리
10. 문서화만 처리

## Batch Plan

### Batch 1: Package Skeleton
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/`
- 예상 생성 디렉터리:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/controller/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/request/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/response/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/enums/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/service/`

목표:
- 새 패키지 골격 생성
- 기존 코드 이동은 아직 하지 않음

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew compileJava
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/MemberController.java \
  backend/src/main/java/com/gymcrm/member/MemberService.java \
  backend/src/main/java/com/gymcrm/member/MemberRepository.java
```

### Batch 2: Controller DTO Extraction
대상 파일:
- [MemberController.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberController.java)
- 예상 생성 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/request/MemberUpdateRequest.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/response/MemberDetailResponse.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/response/MemberSummaryResponse.java`

목표:
- controller 내부 record만 외부 파일로 분리
- 이름 규칙은 `MemberCreateRequest`, `MemberUpdateRequest`, `MemberDetailResponse`, `MemberSummaryResponse`로 통일
- API field name/validation message 유지
- `recordPiiRead(...)` 유지

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/MemberController.java \
  backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java \
  backend/src/main/java/com/gymcrm/member/dto/request/MemberUpdateRequest.java \
  backend/src/main/java/com/gymcrm/member/dto/response/MemberDetailResponse.java \
  backend/src/main/java/com/gymcrm/member/dto/response/MemberSummaryResponse.java
```

### Batch 3: Service Summary Extraction
대상 파일:
- [MemberService.java](/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberService.java)
- 필요 시 예상 생성 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/service/MemberSummary.java`

목표:
- service 내부 record 분리
- 아직 enum 전환은 하지 않음

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberServiceTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/MemberService.java \
  backend/src/main/java/com/gymcrm/member/service/MemberSummary.java \
  backend/src/test/java/com/gymcrm/member/MemberServiceTest.java
```

### Batch 4: Package Move
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/Member.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberEntity.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/MemberJpaRepository.java`
- 이동 목표 경로:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/Member.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/MemberEntity.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberJpaRepository.java`

목표:
- 파일 이동과 import 정리만 수행
- 동작 변경 금지

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew clean compileJava
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/Member.java \
  backend/src/main/java/com/gymcrm/member/MemberEntity.java \
  backend/src/main/java/com/gymcrm/member/MemberRepository.java \
  backend/src/main/java/com/gymcrm/member/MemberQueryRepository.java \
  backend/src/main/java/com/gymcrm/member/MemberJpaRepository.java
```

### Batch 5: Repository Consolidation
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberJpaRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/service/MemberService.java`

목표:
- service는 `MemberRepository` 하나만 의존하도록 정리
- `MemberJpaRepository`는 기본 영속화/단건 조회 역할로 제한
- `MemberQueryRepository`는 QueryDSL 조회 역할로 제한
- JPA/QueryDSL 구현 세부사항은 repository 내부로 감춤

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberServiceTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java \
  backend/src/main/java/com/gymcrm/member/repository/MemberJpaRepository.java \
  backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java \
  backend/src/main/java/com/gymcrm/member/service/MemberService.java \
  backend/src/test/java/com/gymcrm/member/MemberServiceTest.java
```

### Batch 6: QueryDSL Recovery
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/MemberEntity.java`
- generated source output under backend build dir

목표:
- stale `Q*` source 제거
- 새 package 기준으로 재생성

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew clean test --tests com.gymcrm.member.MemberServiceTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java \
  backend/src/main/java/com/gymcrm/member/entity/MemberEntity.java
```

### Batch 7: Enum Introduction
대상 파일:
- 예상 생성 파일:
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/enums/Gender.java`
  - `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/enums/MemberStatus.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/request/MemberUpdateRequest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/response/MemberDetailResponse.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/dto/response/MemberSummaryResponse.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/service/MemberService.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/Member.java`

목표:
- enum class 추가
- `@JsonCreator` 또는 동등한 단일 parse path 추가
- response는 기존 uppercase 문자열 유지

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberServiceTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/enums/Gender.java \
  backend/src/main/java/com/gymcrm/member/enums/MemberStatus.java \
  backend/src/main/java/com/gymcrm/member/dto/request/MemberCreateRequest.java \
  backend/src/main/java/com/gymcrm/member/dto/request/MemberUpdateRequest.java \
  backend/src/main/java/com/gymcrm/member/dto/response/MemberDetailResponse.java \
  backend/src/main/java/com/gymcrm/member/dto/response/MemberSummaryResponse.java \
  backend/src/main/java/com/gymcrm/member/service/MemberService.java \
  backend/src/main/java/com/gymcrm/member/entity/Member.java
```

### Batch 8: Repository/Entity Enum Boundary
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/entity/MemberEntity.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/main/java/com/gymcrm/member/repository/MemberJpaRepository.java`

목표:
- DB string <-> enum 변환 경계를 repository/entity 한 곳으로 고정
- QueryDSL와 summary logic 회귀 없이 반영

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberSummaryApiIntegrationTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/main/java/com/gymcrm/member/entity/MemberEntity.java \
  backend/src/main/java/com/gymcrm/member/repository/MemberRepository.java \
  backend/src/main/java/com/gymcrm/member/repository/MemberQueryRepository.java \
  backend/src/main/java/com/gymcrm/member/repository/MemberJpaRepository.java \
  backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java
```

### Batch 9: Hardening Tests
대상 파일:
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberServiceTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java`
- `/Users/abc/projects/GymCRM_V2/backend/src/test/java/com/gymcrm/member/MemberPiiEncryptionIntegrationTest.java`

목표:
- invalid enum input
- lowercase/trimmed input
- legacy row 호환성
- PII field 비노출

검증:
```bash
cd /Users/abc/projects/GymCRM_V2/backend && ./gradlew test --tests com.gymcrm.member.MemberServiceTest --tests com.gymcrm.member.MemberSummaryApiIntegrationTest --tests com.gymcrm.member.MemberPiiEncryptionIntegrationTest
```

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  backend/src/test/java/com/gymcrm/member/MemberServiceTest.java \
  backend/src/test/java/com/gymcrm/member/MemberSummaryApiIntegrationTest.java \
  backend/src/test/java/com/gymcrm/member/MemberSummaryQueryPerformanceIntegrationTest.java \
  backend/src/test/java/com/gymcrm/member/MemberPiiEncryptionIntegrationTest.java
```

### Batch 10: Pattern Documentation
대상 파일:
- 예상 생성 파일:
  - `/Users/abc/projects/GymCRM_V2/docs/notes/2026-03-23-member-module-package-patterns.md`
- 필요 시 [AGENTS.md](/Users/abc/projects/GymCRM_V2/AGENTS.md)

목표:
- 이번 `member` 정렬 규칙을 후속 모듈용으로 문서화

검증:
- 문서 diff 검토

권장 aider 명령:
```bash
cd /Users/abc/projects/GymCRM_V2
aider --model ollama/qwen2.5-coder:3b-4k \
  docs/notes/2026-03-23-member-module-package-patterns.md \
  AGENTS.md
```

## 소형 모델용 프롬프트 규칙
- “이번 배치의 파일만 수정하라”
- “다른 phase의 작업은 하지 마라”
- “기존 API contract와 validation message를 유지하라”
- “수정 후 어떤 파일을 바꿨는지와 남은 TODO를 짧게 적어라”

## 배치 프롬프트 예시
```text
Implement Batch 2 of docs/plans/2026-03-23-refactor-member-module-package-realignment-aider-execution-guide.md only.

Scope:
- Extract controller request/response records from MemberController into separate DTO files.
- Use DTO names `MemberCreateRequest`, `MemberUpdateRequest`, `MemberDetailResponse`, `MemberSummaryResponse`.
- Preserve API field names, validation messages, and recordPiiRead behavior.
- Do not introduce enums yet.
- Do not move repository files yet.

After edits, summarize changed files and any follow-up needed for the next batch.
```

## 주의
- `qwen2.5-coder:3b-4k`는 긴 문맥 유지가 약하므로, 매 배치마다 플랜 전체 대신 해당 배치 섹션만 복사해 주는 편이 안전하다.
- 한 번에 import 대량 수정과 enum 전환과 테스트 추가를 같이 시키면 실패 확률이 높다.
- batch 사이마다 사람이 `git diff`와 테스트 결과를 확인하고 다음 배치로 넘기는 운영이 전제다.
