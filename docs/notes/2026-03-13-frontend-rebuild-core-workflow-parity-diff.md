# Frontend Rebuild Core Workflow Parity Diff

Date: 2026-03-13

## Scope

- baseline frontend: `/Users/abc/projects/GymCRM_V2/frontend`
- rebuild frontend: `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/frontend-rebuild`
- workflows compared:
  - 회원관리
  - 회원권 업무
  - 예약 관리
  - 출입 관리

## Summary Matrix

| Workflow | Baseline | Rebuild | Current judgement |
|---|---|---|---|
| 회원관리 | section-based shell with live member summary/filter/detail flow | page-first shell with members-domain selected-member owner | 의미상 동일, 구조만 다름 |
| 회원권 업무 | selected-member downstream workspace, purchase/hold/resume/refund | selected-member downstream page, same action surface, live write parity exists | 의미상 동일, local live parity 확보 |
| 예약 관리 | reservation target list + selected-member form/list/schedule flow | same combined flow, selected-member ownership and live write parity exists | 의미상 동일, local live parity 확보 |
| 출입 관리 | 글로벌 operational page, selected member is optional for actions | same global operational page, live trainer unsupported surface explicitly shown | 차이가 있지만 허용 가능 |

## Workflow Diffs

### 1. 회원관리

**Baseline**
- shell SPA 내부 section로 열림
- member summary query가 중심
- row 선택과 editor open이 같은 현재 회원 컨텍스트에 영향을 줌

**Rebuild**
- page-first route `/members`
- members-domain owner가 `selectedMember`를 canonical source로 소유
- shell은 route composition만 담당

**Meaningful difference**
- 구조가 더 page-first라는 차이는 있지만, 사용자 관점 기능 차이는 크지 않음
- rebuild는 selected-member ownership이 더 명시적이라 memberships/reservations handoff가 더 설명 가능함

**Judgement**
- `baseline과 의미상 동일`

### 2. 회원권 업무

**Baseline**
- selected member가 있으면 바로 workflow
- 없으면 picker/fallback에서 회원 선택
- purchase / hold / resume / refund 흐름 제공

**Rebuild**
- selected member downstream page로 동일 흐름
- live mode에서 구매/홀딩/해제/환불 write endpoint 연결됨
- product data는 shared canonical query를 통해 소비됨

**Meaningful difference**
- rebuild는 page-owned mutation state가 더 분리돼 있음
- 현재 evidence는 local live parity 중심이며, staging smoke는 아직 없음

**Judgement**
- `baseline과 의미상 동일`

### 3. 예약 관리

**Baseline**
- reservation target list
- selected-member handoff
- reservable memberships + schedules + reservation actions
- trainer-scoped reservation 제한 존재

**Rebuild**
- same combined page flow
- selected-member owner와 연결
- reservable membership policy / stale-response guard / trainer scope parity 반영
- live reservation create/check-in/complete/cancel/no-show parity 존재

**Meaningful difference**
- rebuild는 page-first route 구조라 shell wiring이 다름
- 현재는 local live + browser smoke evidence까지 있고, staging parity는 아직 없음

**Judgement**
- `baseline과 의미상 동일`

### 4. 출입 관리

**Baseline**
- selected member 없이도 글로벌 operational page로 사용 가능
- 현재 입장 현황 / 최근 이벤트 / 회원 검색은 항상 볼 수 있음
- 실제 write/read는 admin/desk 중심

**Rebuild**
- 초기에는 member-gated였으나 parity 과정에서 baseline처럼 글로벌 page로 정렬됨
- selected member는 action prefill만 담당
- live trainer는 backend 미지원이므로 unsupported notice + disabled surface로 처리

**Meaningful difference**
- trainer unsupported surface를 더 명시적으로 드러냄
- baseline도 backend 계약상 trainer는 미지원이므로, 이 차이는 parity를 해치기보다 오히려 명확성 쪽 차이임

**Judgement**
- `차이가 있지만 허용 가능`

## Allowed Differences

- page-first route structure 자체
- selected-member ownership이 members domain으로 더 명시적인 점
- live unsupported surface를 UI에서 더 분명히 설명하는 점

위 차이들은 운영 의미를 바꾸지 않고, 오히려 구조/권한 설명력을 높이는 방향으로 본다.

## Remaining Gaps Before Cutover Talk

- staging에서 같은 4개 workflow를 다시 smoke해야 함
- local live parity는 확보했지만 staging cookie/proxy/environment 차이는 아직 보지 못함
- migration / rollback 문서가 아직 없음

## Evidence

- shell/core smoke:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-12-frontend-rebuild-core-flows-smoke.md`
- live auth/session:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-auth-session-flow.md`
- live API blockers:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-blocker-log.md`
- memberships live parity:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-api-foundation.md`
- reservations live parity:
  - `/Users/abc/projects/GymCRM_V2/.worktrees/codex/refactor-frontend-rebuild-v1/docs/notes/2026-03-13-frontend-rebuild-live-reservations-flow.md`
