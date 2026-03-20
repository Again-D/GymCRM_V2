---
title: "members CRUD browser validation"
type: note
status: completed
date: 2026-03-20
origin: docs/plans/2026-03-20-feat-members-crud-modal-management-plan.md
---

# members CRUD browser validation

## Scope

- members CRUD modal flow on mock/prototype admin session
- create -> edit -> deactivate path sanity check
- inactive member rendering and `회원권 없음` filter compatibility

## Environment

- frontend dev server with `VITE_REBUILD_MOCK_DATA=1`
- URL: `http://127.0.0.1:4174/members`

## Validated

- 신규 회원 등록 모달이 열린다.
- 등록 후 상세 모달로 전환된다.
- 수정 후 목록 연락처가 최신 값으로 갱신된다.
- 비활성 회원 기본 렌더링은 `비활성` 상태 배지로 유지된다.
- `회원권 없음` 필터 선택 시 `비활성 + 회원권 없음` 회원이 목록에 남는다.

## Notes

- browser smoke 중 mutation 직후 같은 render의 `loadMembers()` 재호출이 stale cache를 덮을 수 있는 경로를 발견했고, 목록 갱신은 invalidation-driven effect에 맡기도록 정리했다.
- agent-browser ref 기반 자동화 특성상 row click 자체는 불안정할 수 있어, row click contract는 component test와 함께 해석해야 한다.

## Artifacts

- [members-crud-baseline-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-baseline-20260320.png)
- [members-crud-create-modal-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-create-modal-20260320.png)
- [members-crud-after-create-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-after-create-20260320.png)
- [members-crud-edit-modal-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-edit-modal-20260320.png)
- [members-crud-after-edit-20260320b.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-after-edit-20260320b.png)
- [members-crud-deactivate-confirm-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-deactivate-confirm-20260320.png)
- [members-crud-filter-no-membership-20260320.png](/Users/abc/projects/GymCRM_V2/docs/notes/members-crud-filter-no-membership-20260320.png)
