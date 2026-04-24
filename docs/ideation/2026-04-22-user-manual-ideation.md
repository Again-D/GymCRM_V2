---
date: 2026-04-22
topic: user-manual-creation
focus: 사용자 매뉴얼 제작
---

# Ideation: 사용자 매뉴얼 제작

## Codebase Context
- Project: GymCRM_V2 (React/TypeScript Frontend, Spring Boot Backend)
- Target Audience: 헬스장 직원, 강사, 매니저, 그리고 해당 산출물을 검토할 상급자.
- Constraint: 상급자에게 카카오톡으로 쉽게 전송 및 공유할 수 있는 형태여야 함 (PDF 파일 또는 접근 쉬운 단일 링크).

## Ranked Ideas

### 1. 단일 마크다운 문서 (PDF 변환용) - **Selected**
**Description:** 프로젝트 내에 깔끔하게 포맷팅된 단일 Markdown 파일을 작성하고, 이를 PDF로 변환하여 카카오톡으로 전송.
**Rationale:** 개발 환경에서 작성 및 유지보수가 쉽고, 최종 결과물을 누구나 쉽게 열어볼 수 있는 PDF 파일 형태로 상급자에게 바로 전달 가능함.
**Downsides:** 문서 내용이 길어질 경우 모바일 환경에서 PDF 가독성이 떨어질 수 있음.
**Confidence:** 95%
**Complexity:** Low
**Status:** Explored

### 2. 상황 인지형 앱 내 도움말 사이드바
**Description:** CRM 시스템 내부에 매뉴얼을 내장하여 관련 화면에서 띄워주는 기능.
**Rationale:** 실제 사용자(직원)에게는 가장 좋은 경험.
**Downsides:** 카카오톡으로 상급자에게 '문서 형태'로 보고하기 어려움. 개발 공수 발생.
**Confidence:** 60% (현재 제약사항 기준)
**Complexity:** Medium
**Status:** Unexplored

### 3. 역할별 데스크용 인쇄 요약본
**Description:** 매니저/강사용으로 나누어 핵심 기능만 1~2장으로 압축한 PDF 가이드.
**Rationale:** 카카오톡 전송이 용이하며, 상급자가 한눈에 핵심 기능을 파악하기 좋음.
**Downsides:** 전체 시스템에 대한 포괄적인 설명은 부족할 수 있음.
**Confidence:** 85%
**Complexity:** Low
**Status:** Unexplored

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | 마크다운 정적 사이트 배포 (Docusaurus) | 별도의 웹 호스팅(URL 배포)이 필요하며, 단순 파일 전송을 원하는 현재 요구사항에 오버스펙임 |
| 2 | 인터랙티브 UI 온보딩 가이드 | 카카오톡으로 시안을 보내기 힘들며, 시스템에 직접 로그인해야만 확인 가능함 |
| 3 | AI 기반 매뉴얼 챗봇 | 구축 비용이 매우 크며, 단순 보고 및 전송용 매뉴얼 목적에 맞지 않음 |

## Session Log
- 2026-04-22: Initial ideation — 5 candidates generated. User clarified the manual needs to be sent to a superior via KakaoTalk.
- 2026-04-22: Shifted focus to a single Markdown/PDF document format for easy sharing. Idea 1 selected for brainstorming.
