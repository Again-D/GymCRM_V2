---
title: "feat: 라이트/다크 모드 가독성 향상 구현 계획 (Dark Mode Readability Improvements)"
date: 2026-04-01
status: completed
---

# 라이트/다크 모드 가독성 향상 구현 계획 (Dark Mode Readability Improvements)

## 1. 개요 (Overview)

회원 관리 화면(MemberListSection) 및 글로벌 헤더 영역(HeaderLayout)에서 테마 전환(다크 모드, 라이트 모드) 시 발생하는 가독성 저하 문제를 해결합니다. 특히 배경색이 겹쳐 구분이 어렵거나 명도 대비가 떨어지는 상태 태그, 선택된 테이블 행 배경, 제어 버튼의 속성(`variant`/`type`)과 CSS 전역 테마를 조정하여 직관적이고 쾌적한 UI를 제공합니다.

### 1.1 해결하려는 문제
- 회원 관리 화면의 테이블에서 행(Row) 선택 시 배경색이 어두워 글자가 잘 보이지 않는 현상.
- 회원 상태 및 회원권 상태 값(`Tag` 컴포넌트)의 배경색이 테마와 섞여 구분이 모호한 현상.
- 글로벌 헤더(`HeaderLayout`)의 로그아웃 버튼과 테마 전환 버튼, 세션 제어 로직이 다크 모드 시 배경에 묻혀 식별이 어려운 현상.

### 1.2 접근 방향 (아이디어 2+3 혼합 방식)
1. **명시적 컴포넌트 속성 적용:** 
   - 상태 배지(`Tag`) 및 헤더 제어 버튼(`Button`, `Segmented`)에 대해 명시적인 속성을 주입하여(`type`, `variant`, `color`) 투명도를 피해 다크/라이트 모드 양방향 모두에서 시인성을 높입니다.
2. **국지적 전역 CSS 오버라이드:**
   - 전역 스타일(`[data-theme='dark']`) 내 특정 선택자에 한정하여 `.ant-table-row-selected` 속성의 배경색과 가시성 테두리(`border-left`) 하이라이팅을 추가하여 모드 변화에도 텍스트 명도가 보장되도록 개선합니다.

---

## 2. 구현 단위 (Implementation Units)

### [ ] Unit 1: 헤더 레이아웃(`HeaderLayout`) 컴포넌트 대비(Contrast) 강화
- **목표:** 다크 모드 환경에서도 세션 제어 버튼과 화면 모드 탭이 시각적으로 명확히 분리되도록 덮어씁니다.
- **파일:**
  - `frontend/src/components/layout/HeaderLayout.tsx`
- **구현 내용:**
  - "로그아웃" 버튼: 붉은 바탕이 명확해지도록 `<Button danger size="small">`을 `<Button danger type="primary" size="small">`로 변경하여 Solid하게 칠해지도록 개선.
  - "데모" / "관리자" / "초기화" 등 다른 제어 버튼: 배경과 분리하도록 `variant="outlined"` 또는 `type="default"` 기반 고대비 설정 적용.
- **테스트 시나리오:**
  - [ ] 다크 모드 상태에서 우하단 [로그아웃] 버튼이 붉게 면으로 채워지는지 눈으로 확인.
  - [ ] [데모], [관리자], [초기화] 등 기본 회색 단추들이 다크 모드 판넬(`HeaderLayout`) 배경에 묻혀 흐려지지 않는지 확인.

### [ ] Unit 2: 회원 관리 테이블(`MemberListSection`) 상태 태그 시인성 확보
- **목표:** "회원 상태" 및 "회원권 운영 상태"를 나타내는 태그(`Tag`)가 글자와 배경 간 색상 충돌 없이 눈에 잘 띄게 처리.
- **파일:**
  - `frontend/src/pages/members/components/MemberListSection.tsx`
- **구현 내용:**
  - 테이블 Col 선언의 `memberStatus` 및 `membershipOperationalStatus` 내 렌더링을 수정.
  - 현재 `tag` 속성 중 `bordered`를 false로 두거나 Ant Design 고대비 커스텀 variant(가령 `bordered={false}` 이면서 글씨색은 어둡게/밝게 명시, 또는 `Tag` 내장 `color` 속성에 맞춰 채도 조절)를 도입하여 옅은 배경에 진한 글씨 대신 바탕과 분리된 색상을 사용.
- **테스트 시나리오:**
  - [ ] 라이트/다크 두 테마에서 모두 "활성", "비활성" 회원 상태 타일이 텍스트 손실 없이 명확한지 확인.
  - [ ] 회원권 상태별("정상", "만료임박", "홀딩중") 고유 색상이 흐려지지 않고 가독성 있게 표현되는지 점검.

### [ ] Unit 3: 글로벌 선택 행(`Selected Row`) 하이라이트 투명도 개선
- **목표:** 테이블 컨텍스트에서 선택된 행의 글씨가 뭉개지는 현상을 막고, 클릭 피드백(Focus)이 즉시 전달되도록 디자인 시스템 오버라이드.
- **파일:**
  - `frontend/src/index.css`
- **구현 내용:**
  - `index.css` 하단 전역 또는 다크 모드(`[data-theme='dark']`) 스코프에 `.ant-table-wrapper .ant-table-tbody > tr.ant-table-row-selected > td` 클래스에 대한 명시적 오버라이드.
  - 기존 배경색을 투명도 중심으로 밝히면서(`background: rgba(96, 165, 250, 0.15)` 등), 테이블 왼쪽 테두리에 파란 바(`border-left: 3px solid var(--status-info)`)를 인디케이터로 추가해, 색깔의 짙음에 의존하지 않아도 어떤 행이 선택되었는지 강렬하게 표현.
- **테스트 시나리오:**
  - [ ] 라이트 모드에서 회원 1명을 클릭 시 왼쪽 파란 테두리(`border-left`)가 표시되고 배경색이 옅은 파란색이어 글자 방해가 없는지 확인.
  - [ ] 다크 모드에서 회원 1명을 클릭 시, 배경이 짙은 회색이면서 파란 인디케이터가 떠서 가독성이 뭉개지지 않는지 확인.

---

## 3. 진행 방식 가이드 (Execution Notes)
- 본 계획서는 Ant Design 5.x 의 Token 시스템 전체를 파괴적으로 뜯어고치기보다는 **기존 컴포넌트 Props를 직관적으로 조정**하는 것과 **타겟팅된 부분 CSS 오버라이드**를 지향하는 경량 플랜입니다.
- 기능 결함 리스크가 매우 낮습니다.
- 작업자는 실행 후 바로 `npm run dev` 등을 통해 브라우저를 띄워 모드를 번갈아가며 실제 상태를 직접 눈으로 점검해야 합니다.
