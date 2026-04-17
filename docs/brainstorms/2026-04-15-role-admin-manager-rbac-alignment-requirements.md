---
date: 2026-04-15
topic: role-admin-manager-rbac-alignment
---

# ROLE_ADMIN and ROLE_MANAGER RBAC Alignment

## Problem Frame
현재 RBAC 문서와 구현 사이에 역할 경계가 흐릿하다. `ROLE_ADMIN`은 헬스장 원장/대표에게 부여되는 최상위 운영 역할이고, `ROLE_MANAGER`는 부원장/매니저 역할이다. 두 역할은 대부분의 운영 기능을 공유하지만, 회원 삭제, 시스템 설정, 사용자 계정 관리는 `ROLE_ADMIN`만 접근 가능해야 한다.

이 정렬이 필요하다. 역할 이름이 비슷하다고 기능 경계까지 같아지면 운영 책임과 권한이 섞이고 민감 기능에 대한 접근 통제가 느슨해진다. 반대로 문서만 바꾸고 실제 권한 경계를 정리하지 않으면 팀은 계속 서로 다른 의미의 “admin”을 이야기하게 된다.
이 문서의 범위는 센터(헬스장) 운영 권한이다. 플랫폼 전역 역할이 별도로 존재하더라도, 그 관계는 이 문서에서 직접 재설계하지 않는다.
`ROLE_SUPER_ADMIN`이 존재한다면, 이 문서는 그것을 센터 RBAC와 구분되는 별도 상위 역할로 본다.

## Requirements

**Role hierarchy and ownership**
- R1. `ROLE_ADMIN`은 헬스장 원장/대표에게 부여되는 최상위 운영 역할로 정의한다.
- R2. `ROLE_MANAGER`는 부원장/매니저에게 부여되는 운영 역할로 정의한다.
- R3. `ROLE_ADMIN`과 `ROLE_MANAGER`는 센터 범위에서만 비교되며, 다른 상위 역할과의 관계는 별도 범위로 둔다.
- R4. 두 역할의 공통 운영 범위는 유지하되, 민감 기능은 분리된 접근 규칙을 가진다.

**Admin-only capabilities**
- R5. 회원 삭제는 `ROLE_ADMIN`만 수행할 수 있다.
- R6. 시스템 설정은 `ROLE_ADMIN`만 접근할 수 있다.
- R7. 사용자 계정 관리는 `ROLE_ADMIN`만 접근할 수 있다.

**Manager capabilities**
- R8. `ROLE_MANAGER`는 회원 삭제, 시스템 설정, 사용자 계정 관리에 접근할 수 없다.
- R9. `ROLE_MANAGER`는 `ROLE_ADMIN` 전용 기능을 제외한 기존 운영 기능을 수행할 수 있다.
- R10. `ROLE_MANAGER`가 볼 수 있는 정보와 수정할 수 있는 정보는 서로 다를 수 있으며, 민감한 설정/계정 데이터는 과노출되지 않아야 한다.

**Documentation and contract alignment**
- R11. RBAC 관련 문서, 권한 매트릭스, 화면 설명은 `ROLE_ADMIN`과 `ROLE_MANAGER`의 차이를 일관되게 반영해야 한다.
- R12. 사용자 역할을 설명하는 문구는 “admin”과 “manager”를 혼용하지 않고, 기능 경계와 함께 읽히도록 정리해야 한다.

**Role assignment and enforcement**
- R13. `ROLE_ADMIN`과 `ROLE_MANAGER`의 부여/회수는 명시된 승인 규칙을 따라야 하며, 자기 자신에게 상위 권한을 부여하는 흐름은 허용하지 않는다.
- R14. 권한 제한은 UI 숨김만으로 끝나지 않고, 서버-side authorization에서도 강제되어야 한다.
- R15. 센터를 벗어난 다른 센터의 회원, 설정, 계정에 대한 영향은 허용되지 않는다.
- R32. 센터 운영자(`ROLE_ADMIN`)는 다른 사용자에게 `ROLE_ADMIN`을 부여/회수할 수 없다. `ROLE_ADMIN` 부여/회수는 `ROLE_SUPER_ADMIN`만 수행할 수 있다.

**User account management (MVP scope)**
- R16. 사용자 계정 관리의 MVP는 “센터 내 사용자 계정 운영 액션”에 집중한다: 접근 강제 무효화, 역할 변경, 상태 변경.
- R17. 사용자 계정 관리 화면(또는 동등한 UI surface)은 `ROLE_ADMIN`만 접근할 수 있다.
- R18. 사용자 계정 관리 화면은 현재 센터 범위의 사용자 목록을 제공하고, 각 사용자에 대해 최소한 `userName`, `loginId`(또는 식별 가능한 로그인 키), `roleCode`, `userStatus`를 확인할 수 있어야 한다.
- R35. 사용자 목록은 간단 검색(이름 또는 loginId), 역할(roleCode) 필터, 상태(userStatus) 필터를 제공해야 한다.
- R36. 사용자 목록은 페이징을 지원해야 하며, 기본 페이지 크기는 20으로 한다.
- R19. 관리자(`ROLE_ADMIN`)는 특정 사용자에 대해 “접근 강제 무효화(revoke-access)”를 실행할 수 있어야 하며, 실행 결과를 확인할 수 있어야 한다.
- R20. 관리자(`ROLE_ADMIN`)는 특정 사용자에 대해 역할 변경을 실행할 수 있어야 한다. 이 작업은 자기 자신의 역할 변경을 허용하지 않는다.
- R33. 역할 변경은 운영 역할 범위에서만 허용한다: `ROLE_MANAGER`, `ROLE_DESK`, `ROLE_TRAINER`.
- R21. 관리자(`ROLE_ADMIN`)는 특정 사용자에 대해 상태 변경(활성/비활성)을 실행할 수 있어야 한다.
- R34. 상태 변경은 `ACTIVE`와 `INACTIVE` 사이의 양방향 변경을 허용한다.
- R22. 사용자 계정 관리 관련 운영 작업은 감사 로그에서 추적 가능해야 한다.
- R30. 사용자 계정 관리 화면의 사용자 목록은 현재 센터의 전체 직원 사용자(`ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_DESK`, `ROLE_TRAINER`)를 포함한다.
- R31. 사용자 계정 관리 화면의 사용자 목록은 `ACTIVE`와 `INACTIVE` 사용자를 모두 포함한다.
- R37. 사용자 계정 관리 화면은 각 사용자 행에 운영 액션 버튼을 제공한다.
- R38. 각 운영 액션은 실행 전 확인 단계와 성공/실패 결과 표시를 제공해야 한다.

**User account management (Deferred)**
- R23. 사용자 계정 생성/초대는 이번 MVP 범위에서 제외하고 후속 범위로 다룬다.

**System settings (MVP scope)**
- R24. 시스템 설정의 MVP는 “센터 운영정보(센터 프로필)” 설정을 제공한다.
- R25. 시스템 설정 화면(또는 동등한 UI surface)은 `ROLE_ADMIN`만 접근할 수 있다.
- R26. 시스템 설정 화면은 현재 센터의 운영정보를 조회할 수 있어야 한다.
- R27. 관리자(`ROLE_ADMIN`)는 현재 센터의 운영정보를 수정할 수 있어야 한다.
- R28. 센터 운영정보는 사용자에게 노출되는 표시 정보를 포함할 수 있으며, MVP 이후 확장 가능하다.
- R29. 센터 프로필 MVP 필드는 `센터명`, `대표 연락처(전화)`, `주소`를 포함한다.
- R39. 센터 프로필 UI는 기본적으로 읽기 전용으로 표시하고, “수정” 진입 시에만 편집 가능한 폼으로 전환한다.
- R40. 시스템 설정은 사이드바에 “시스템 설정” 메뉴로 노출하며, `ROLE_ADMIN`에게만 보인다.

## Success Criteria
- `ROLE_ADMIN`과 `ROLE_MANAGER`의 차이를 문서만이 아니라 실제 권한 경계로 설명할 수 있다.
- 회원 삭제, 시스템 설정, 사용자 계정 관리가 `ROLE_MANAGER`에서 차단되고 `ROLE_ADMIN`에서만 가능하다는 규칙이 명확하다.
- 동일한 센터 안에서 `ROLE_ADMIN`은 민감 관리 기능을 수행할 수 있고, `ROLE_MANAGER`는 그 경계를 넘지 못한다.

