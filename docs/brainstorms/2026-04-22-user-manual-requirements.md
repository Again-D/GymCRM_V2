---
date: 2026-04-22
topic: user-manual-creation
---

# GymCRM V2 보고용 사용자 매뉴얼 (Quick Reference)

## Problem Frame
- 상급자에게 GymCRM V2의 주요 기능과 사용법을 보고하기 위한 매뉴얼이 필요함.
- 복잡한 웹 구축보다는 카카오톡으로 즉시 전송 가능한 깔끔한 PDF 변환용 마크다운 문서를 작성해야 함.

## Requirements

**[Manual Format & Delivery]**
- R1. 프로젝트 내에 단일 Markdown 문서로 작성되어야 함.
- R2. 작성 완료 후 에디터 등을 통해 깔끔하게 PDF로 변환하기 쉬운 구조(마크다운 문법)여야 함.

**[Target Audience & Structure]**
- R3. 매니저(관리자)와 강사(트레이너)의 역할을 모두 아우르는 **통합 매뉴얼**로 챕터를 구성해야 함.
- R4. 디테일한 클릭 순서보다는 **핵심 기능 요약(Quick Reference)** 위주로 작성되어야 함 (기능의 목적, 위치, 주요 룰 및 정책 위주).

## Success Criteria
- 상급자가 매뉴얼을 읽고 GymCRM V2가 어떤 역할을 하고 어떤 기능이 있는지 한눈에 파악할 수 있다.
- PDF 변환 시 깨짐 없이 깔끔하게 렌더링된다.

## Scope Boundaries
- 별도의 웹 호스팅이나 배포 사이트(Docusaurus 등) 구축은 제외함.
- 각 화면의 세세한 버튼 클릭 순서 가이드나 복잡한 캡처는 제외함 (빠른 요약 형태).

## Key Decisions
- **Format**: PDF 변환용 단일 Markdown 파일
- **Depth**: 상세 가이드가 아닌 핵심 기능과 정책 요약(Quick Reference)
- **Structure**: 매니저 / 강사 역할 통합 구성
- **Visuals**: 상급자 보고용 퀄리티를 높이기 위해, 핵심 기능(대시보드, 회원 목록 등)의 스크린샷이 들어갈 이미지 플레이스홀더(`![이미지]()`)를 적절히 포함하여 작성.

## Session Log
- 2026-04-22: 사용자 매뉴얼 초안 생성 완료. 산출물은 [docs/GymCRM_V2_User_Manual_Report_Ready.md](docs/GymCRM_V2_User_Manual_Report_Ready.md).
