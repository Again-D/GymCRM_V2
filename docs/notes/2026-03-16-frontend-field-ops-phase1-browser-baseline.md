---
title: "Frontend field ops phase 1 browser baseline"
date: 2026-03-16
status: active
---

# Frontend field ops phase 1 browser baseline

## Scope

- mock runtime server: `VITE_REBUILD_MOCK_DATA=1`
- live login surface: `http://127.0.0.1:4174/login`
- representative routes:
  - `/dashboard?authMode=prototype`
  - `/members?authMode=prototype`
  - `/memberships`
  - `/reservations?authMode=prototype`

## Validation Summary

- representative phase 1 routes rendered without browser runtime errors.
- shell, login, members, memberships, and reservations all reflected the new field-ops visual hierarchy.
- memberships modal and reservations modal both opened successfully in the mock runtime flow.
- dark theme persisted through dashboard reload in the same browser session.
- tablet-width smoke was captured for dashboard and members at `1024x900`.

## Artifacts

- login baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-login-baseline.png`
- dashboard baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-dashboard-baseline.png`
- dashboard dark baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-dashboard-dark-baseline.png`
- dashboard dark reload baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-dashboard-dark-reload-baseline.png`
- dashboard tablet baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-dashboard-tablet-baseline.png`
- members baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-members-baseline.png`
- members tablet baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-members-tablet-baseline.png`
- memberships baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-memberships-baseline.png`
- memberships modal baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-memberships-modal-baseline.png`
- reservations baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-reservations-baseline.png`
- reservations focused baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-reservations-focused-baseline.png`
- reservations modal baseline: `/Users/abc/projects/GymCRM_V2/docs/notes/phase1-reservations-after-click-check.png`

## Notes

- the first reservations modal screenshot was captured before the modal fully opened; the later `phase1-reservations-after-click-check.png` file is the verified modal artifact.
- live auth remained on the operator login surface, so internal representative-flow validation was completed against the mock runtime route set.
