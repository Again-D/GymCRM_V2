---
date: 2026-04-13
topic: settlement-empty-buckets
---

# Settlement Empty Buckets

## Problem Frame
`/settlements`의 매출 추이 화면은 현재 `sales-report`의 실제 집계가 있는 bucket만 보여준다. 그 결과 일별 추이에서 빈 날짜가 빠지고, 운영자는 "그날 매출이 0이었는지"와 "아예 데이터가 없는 구간인지"를 한눈에 읽기 어렵다.

이 문제는 차트만의 문제가 아니다. 같은 `trend` 배열을 표와 Excel export도 공유하므로, 빈 bucket이 누락되면 시각화와 검증 표가 같은 기간을 다르게 보여주게 된다.

## Requirements

**Trend completeness**
- R1. `sales-report`의 `trend`는 선택된 조회 기간의 bucket을 연속적으로 표현해야 한다.
- R2. `trend`는 `trendGranularity`가 `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` 중 어느 값이든 해당 기간의 모든 bucket을 포함해야 한다.
- R3. 실제 거래가 없는 bucket은 누락하지 말고, 금액과 건수 필드를 `0`으로 채워 포함해야 한다.
- R4. bucket의 정렬은 항상 조회 기간의 시간 순서를 따라야 하며, 빈 bucket을 채운 뒤에도 순서를 바꾸지 않아야 한다.

**Consumer consistency**
- R5. 매출 차트, 추이 표, Excel export는 동일한 `trend` 시퀀스를 사용해야 한다.
- R6. 빈 bucket 보정은 특정 화면 전용이 아니라 `sales-report` 응답 수준에서 적용되어야 한다.

## Success Criteria
- 일별 조회에서 거래가 없는 날짜도 차트와 표에 0값 bucket으로 나타난다.
- 주/월/연 조회에서도 bucket이 연속적으로 보이므로 운영자가 기간 전체의 흐름을 끊김 없이 읽을 수 있다.
- 차트, 표, export가 같은 기간을 같은 bucket 집합으로 보여준다.

## Scope Boundaries
- `recent-adjustments`와 같은 다른 리포트는 이번 범위에 포함하지 않는다.
- bucket 라벨 포맷 자체를 새로 정의하지 않는다.
- 차트 스타일, 축 설정, 범례 표현은 이번 요구사항의 핵심이 아니다.

## Key Decisions
- 빈 bucket 보정은 모든 `trendGranularity`에 적용한다. 운영자는 일별만이 아니라 주/월/연에서도 연속된 흐름을 기대하기 때문이다.
- 보정 기준은 `sales-report` 응답이다. 소비자별로 다르게 채우면 같은 기간의 의미가 서로 어긋난다.

## Dependencies / Assumptions
- bucket을 채우는 데 필요한 시작/종료 날짜와 granularity는 이미 조회 요청에 포함된다.
- 각 bucket의 0값 표현은 기존 응답 스키마를 그대로 사용한다.

## Outstanding Questions

### Deferred to Planning
- [Affects R1-R6][Technical] bucket 시퀀스를 어디에서 생성할지, 그리고 어떻게 테스트할지는 planning에서 결정한다.

## Next Steps
→ /ce:plan for structured implementation planning
