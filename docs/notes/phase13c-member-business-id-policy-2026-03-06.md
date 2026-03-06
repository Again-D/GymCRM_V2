# Phase 13-C Member Business ID Policy (2026-03-06)

## Format
- Pattern: `MBR-YYYY-NNNNNN`
- Example: `MBR-2026-001245`

## Generation rule
- DB default expression uses `member_code_seq` sequence.
- Prefix year uses `CURRENT_TIMESTAMP` year at generation time.
- Suffix is 6-digit zero-padded sequence.

## Backfill
- Existing rows with `member_code IS NULL` are backfilled in migration `V19`.
- Backfill uses row `created_at` year and `member_code_seq` value for collision-free suffix.

## Constraints
- `NOT NULL` on `members.member_code`
- format check constraint: `^MBR-[0-9]{4}-[0-9]{6}$`
- unique index by center scope: `uk_members_center_member_code_active`

## API exposure
- `GET /api/v1/members`: includes `memberCode`, supports `memberCode` filter
- `GET /api/v1/members/{memberId}`: includes `memberCode`
- `POST /api/v1/members`: returns generated `memberCode`
