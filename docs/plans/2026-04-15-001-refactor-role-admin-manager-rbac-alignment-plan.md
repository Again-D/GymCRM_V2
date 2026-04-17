---
title: "refactor: Reintroduce ROLE_ADMIN and split center admin/manager RBAC"
type: refactor
status: complete
date: 2026-04-15
origin: docs/brainstorms/2026-04-15-role-admin-manager-rbac-alignment-requirements.md
---

# refactor: Reintroduce ROLE_ADMIN and split center admin/manager RBAC

## Overview

이번 계획은 헬스장 원장/대표용 `ROLE_ADMIN`을 `ROLE_MANAGER` 위에 다시 도입하고, 센터 운영 역할을 명확히 분리하는 리팩터였다. 핵심 목표는 문서에 적힌 `ADMIN / MANAGER` 구분을 런타임 권한 모델, API contract, frontend gating, 테스트 fixture까지 일관되게 맞추는 것이었다.

이 계획은 이후 2026-04-17 MVP 구현으로 실제 완료되었다. 그 구현에서 시스템 설정, 사용자 계정 관리, 센터 프로필, 사용자 목록 API와 관련한 기능이 실제로 추가되었고, 이 계획이 의도한 권한 경계와 화면 surface도 함께 정리되었다.

## Completion Notes

- `ROLE_ADMIN`과 `ROLE_MANAGER`의 역할 경계가 구현과 문서에서 정렬되었다.
- 회원 삭제, 시스템 설정, 사용자 계정 관리 같은 민감 기능은 `ROLE_ADMIN` 기준으로 재정리되었다.
- frontend route gating과 backend authorization이 동일한 정책을 따르도록 정리되었다.
- 관련 테스트와 API 문서가 함께 갱신되었다.

## Outcome

이 계획은 완료되었고, 실제 ship된 구현은 2026-04-17 MVP 작업으로 이어졌다.

